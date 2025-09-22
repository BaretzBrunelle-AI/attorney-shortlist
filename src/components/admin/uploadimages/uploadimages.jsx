import React, { useState, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import "./uploadimages.css";

const UploadImages = () => {
	const {
		selectedProject,
		setSelectedProject,
		attorneys = [],
		availableProjects = [],
		setMissingImages,
	} = useOutletContext() || {};

	// console.log("ATTORNEYS ON LOAD AFTER PROJECT SELECTION", attorneys);

	const [mode, setMode] = useState("single");
	const [statusMsg, setStatusMsg] = useState("");
	const [isUploading, setIsUploading] = useState(false);

	const [rows, setRows] = useState([]);
	const [progress, setProgress] = useState({ done: 0, total: 0 });
	const [singleUploads, setSingleUploads] = useState({});

	const [selectedAttorneys, setSelectedAttorneys] = useState([]);

	const normalize = (s) =>
		s?.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\s]/g, " ")
			.replace(/\b(esq|jr|sr|ii|iii|iv)\b/g, "")
			.replace(/\s+/g, " ")
			.trim() || "";

	const filenameBase = (name) => (name || "").replace(/\.[^.]+$/i, "");

	const getName = (obj) => (typeof obj?.name === "string" ? obj.name.trim() : "");

	const fetchMissingForProject = async (projectName) => {
		if (!projectName) {
			setSelectedAttorneys([]);
			return;
		}
		try {
			setStatusMsg("");

			const { data } = await api.get("/admin/check-images", {
				params: { project_name: projectName },
				admin: true,
			});

			const missing = Array.isArray(data?.attorneys) ? data.attorneys : [];

			// local lookup by normalized name
			const localByName = new Map(
				(attorneys || []).map(a => [normalize(getName(a)), { ...a, name: getName(a) }])
			);

			// authoritative from server; enrich from local if we can
			const selected = missing.map(m => {
				const nm = normalize(getName(m));
				const local = localByName.get(nm);
				return {
					...(local || {}),
					name: getName(m),
					attorney_id: m.attorney_id,
				};
			});

			setSelectedAttorneys(selected);
			// console.log("ATTORNEYS AFTER CHECK IMAGE CALL", selected);

			// // debug
			// console.log("ATTORNEYS:", attorneys);
			// console.log("MISSING:", missing);
			// console.log("SELECTED:", selected);
		} catch (err) {
			console.error("check-images failed:", err?.response?.data || err.message);
			setStatusMsg("Failed to load missing-image list");
			setSelectedAttorneys([]);
		}
	};

	const jaroWinkler = (s1, s2) => {
		const m = (s1, s2) => {
			const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
			let matches1 = new Array(s1.length).fill(false);
			let matches2 = new Array(s2.length).fill(false);
			let matches = 0;
			for (let i = 0; i < s1.length; i++) {
				const start = Math.max(0, i - matchDistance);
				const end = Math.min(i + matchDistance + 1, s2.length);
				for (let j = start; j < end; j++) {
					if (matches2[j]) continue;
					if (s1[i] === s2[j]) {
						matches1[i] = matches2[j] = true;
						matches++;
						break;
					}
				}
			}
			if (!matches) return { jaro: 0, matches, transpositions: 0 };
			let k = 0;
			let transpositions = 0;
			for (let i = 0; i < s1.length; i++) {
				if (!matches1[i]) continue;
				while (!matches2[k]) k++;
				if (s1[i] !== s2[k]) transpositions++;
				k++;
			}
			transpositions = transpositions / 2;
			const jaro =
				(matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;
			return { jaro, matches, transpositions };
		};
		if (!s1 || !s2) return 0;
		const a = m(s1, s2);
		const p = 0.1;
		let l = 0;
		const maxL = 4;
		while (l < Math.min(maxL, s1.length, s2.length) && s1[l] === s2[l]) l++;
		return a.jaro + l * p * (1 - a.jaro);
	};

	const index = useMemo(() => {
		return (selectedAttorneys || []).map(a => {
			const name = getName(a);
			const n = normalize(name);
			const parts = n.split(" ").filter(Boolean);
			const lastFirst =
				parts.length >= 2 ? `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}` : n;
			const noMiddle = parts.length >= 3 ? `${parts[0]} ${parts[parts.length - 1]}` : n;

			return { ...a, name, _n: n, _v: new Set([n, lastFirst, noMiddle]) };
		});
	}, [selectedAttorneys]);

	const analyzeBatch = useCallback((files) => {
		const HIGH = 0.93;
		const LOW = 0.82;
		const MARGIN = 0.05;

		const fileList = (files || []).map(f => ({ file: f, base: filenameBase(f.name) }));

		const nextRows = (selectedAttorneys || []).map((a) => {
			const aName = getName(a);
			const aNorm = normalize(aName);
			const parts = aNorm.split(" ").filter(Boolean);
			const variants = new Set([
				aNorm,
				parts.length >= 2 ? `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}` : aNorm,
				parts.length >= 3 ? `${parts[0]} ${parts[parts.length - 1]}` : aNorm,
			]);

			const scored = fileList
				.map(({ file, base }) => {
					let s = 0;
					const needle = normalize(base);
					for (const v of variants) s = Math.max(s, jaroWinkler(needle, v));
					return { file, base, score: s };
				})
				.sort((x, y) => y.score - x.score);

			const top = scored[0];
			const second = scored[1];

			let status = "unmatched";
			let selectedFile = null;
			let scoreText = "-";
			let detectedBase = "";

			if (top) {
				detectedBase = top.base;

				if (top.score < LOW) {
					status = "unmatched";
					scoreText = "-";
				} else if (top.score >= HIGH) {
					const secondScore = second?.score ?? 0;
					const hasTwoHigh = secondScore >= HIGH;
					const margin = top.score - secondScore;

					if (hasTwoHigh && margin <= MARGIN) {
						status = "review";
						selectedFile = null;
						scoreText = "multiple choices";
					} else {
						status = "ready";
						selectedFile = top.file;
						scoreText = top.score.toFixed(2);
					}
				} else {
					status = "review";
					scoreText = top.score.toFixed(2);
				}
			}

			return {
				attorney_id: a.attorney_id,
				attorney_name: aName,
				suggestion: { name: aName },
				file: selectedFile,
				base: detectedBase,
				options: scored,
				score: top?.score ?? 0,
				scoreText,
				status,
				result: null,
				msg: "",
			};
		});

		setRows(nextRows);
		setProgress({ done: 0, total: nextRows.length });
		setStatusMsg("");
	}, [selectedAttorneys, normalize, jaroWinkler]);

	const updateSelectionFile = (rowIdx, optionIdx) => {
		setRows(prev => {
			const next = [...prev];
			const row = { ...next[rowIdx] };

			// reset any previous result message when changing selection
			row.result = null;
			row.msg = "";

			const hasOptions = Array.isArray(row.options) && row.options.length > 0;

			if (!hasOptions || optionIdx < 0 || optionIdx >= row.options.length) {
				// no selection
				row.file = null;
				row.base = "";
				row.score = 0;
				row.scoreText = "-";
				row.status = "unmatched";
			} else {
				const opt = row.options[optionIdx];
				row.file = opt.file;
				row.base = opt.base || row.base || "";
				row.score = typeof opt.score === "number" ? opt.score : 0;
				row.scoreText = typeof opt.score === "number" ? opt.score.toFixed(2) : "-";
				// once the user explicitly picks a file, treat it as confirmed
				row.status = "ready";
			}

			next[rowIdx] = row;
			return next;
		});
	};

	const uploadAll = async () => {
		const ready = rows.map((r, i) => ({ ...r, idx: i }))
			.filter(r => r.status === "ready" && r.file);

		if (ready.length === 0) return;

		const allowedExts = new Set(["jpg", "jpeg", "png"]);
		const filtered = ready.filter((r) => {
			const ext = (r.file?.name?.split(".").pop() || "").toLowerCase();
			return allowedExts.has(ext);
		});

		if (filtered.length === 0) {
			setRows(prev => {
				const next = [...prev];
				ready.forEach((r) => {
					next[r.idx] = { ...next[r.idx], result: "error", msg: "Unsupported file type" };
				});
				return next;
			});
			setStatusMsg("no supported files to upload (.jpg, .jpeg, .png)");
			return;
		}

		setIsUploading(true);
		setProgress({ done: 0, total: filtered.length });
		setStatusMsg("");

		try {
			const formData = new FormData();
			const metas = [];
			filtered.forEach(({ file, attorney_id }) => {
				formData.append("files", file);
				metas.push({ attorney_id });
			});
			formData.append("metas", JSON.stringify(metas));
			if (selectedProject) formData.append("project_title", selectedProject);

			const res = await api.post("/admin/upload-attorney-image-batch", formData, {
				headers: { "Content-Type": "multipart/form-data" },
				admin: true,
			});

			const results = Array.isArray(res?.data?.results) ? res.data.results : [];

			setRows(prev => {
				const next = [...prev];
				results.forEach((r, i) => {
					const originalIdx = filtered[i].idx;
					if (r.status === "uploaded") {
						next[originalIdx] = { ...next[originalIdx], result: "success", msg: "Uploaded" };
					} else if (r.status === "skipped_existing") {
						next[originalIdx] = { ...next[originalIdx], result: "success", msg: "Already exists" };
					} else {
						next[originalIdx] = { ...next[originalIdx], result: "error", msg: r.error || "Failed" };
					}
				});
				return next;
			});

			if (typeof setMissingImages === "function") {
				results.forEach((r, i) => {
					if (r.status === "uploaded" || r.status === "skipped_existing") {
						const attorneyId = metas[i].attorney_id;
						setMissingImages(prev =>
							prev.map(a => (a.attorney_id === attorneyId ? { ...a, name: "SUCCESS" } : a))
						);
						setTimeout(() => {
							setMissingImages(prev => prev.filter(a => a.attorney_id !== attorneyId));
						}, 3000);
					}
				});
			}

			setProgress({ done: filtered.length, total: filtered.length });
			setStatusMsg("batch upload finished");
		} catch (err) {
			console.error("batch upload failed:", err?.response?.data || err.message);
			setRows(prev => {
				const next = [...prev];
				filtered.forEach((r) => {
					next[r.idx] = { ...next[r.idx], result: "error", msg: "Failed" };
				});
				return next;
			});
			setStatusMsg("upload failed");
		} finally {
			setIsUploading(false);
		}
	};

	const uploadSingle = async (attorneyId, file) => {
		if (!selectedProject || !file) return;
		setIsUploading(true);
		setStatusMsg("");
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("project_title", selectedProject);
			formData.append("attorney_id", attorneyId);
			await api.post("/admin/upload-attorney-image", formData, {
				headers: { "Content-Type": "multipart/form-data" },
				admin: true,
			});
			setStatusMsg("upload successful");
		} catch (err) {
			console.error(err);
			setStatusMsg("upload failed: " + (err?.response?.data || "server error"));
		} finally {
			setIsUploading(false);
		}
	};

	const readyCount = rows.filter((r) => r.status === "ready" && !!r.file).length;

	return (
		<div className="upload-images-main-container">
			<div className="upload-images-container">
				<div id="upload-images-title">Upload Attorney Images</div>

				<select
					id="project-dropdown"
					value={selectedProject || ""}
					onChange={async (e) => {
						const project = e.target.value;
						setSelectedProject?.(project);
						setStatusMsg("");
						setRows([]);
						setSingleUploads({});
						setSelectedAttorneys([]);
						if (project) await fetchMissingForProject(project);
					}}
				>
					<option value="" disabled>Select Project</option>
					{(availableProjects || []).map((project, idx) => (
						<option key={`${project}-${idx}`} value={project}>
							{project}
						</option>
					))}
				</select>

				<div className="mode-toggle">
					<button
						type="button"
						className={mode === "single" ? "active" : "single"}
						onClick={() => setMode("single")}
						disabled={!selectedProject}
					>
						Single
					</button>
					<button
						type="button"
						className={mode === "batch" ? "active" : "batch"}
						onClick={() => setMode("batch")}
						disabled={!selectedProject}
					>
						Batch
					</button>
				</div>

				{mode === "single" && (
					<div className="single-upload-list">
						{(selectedAttorneys || []).map((a, idx) => (
							<div
								key={a.attorney_id || `name:${a.name}-${idx}`}
								className="single-upload-row"
							>
								<span>{a.name}</span>
								<input
									type="file"
									accept=".jpg,.jpeg,.png,image/jpeg,image/png"
									onChange={(e) =>
										setSingleUploads((prev) => ({
											...prev,
											[a.attorney_id]: e.target.files?.[0],
										}))
									}
									disabled={!selectedProject}
								/>
								<button
									onClick={() => uploadSingle(a.attorney_id, singleUploads[a.attorney_id])}
									disabled={
										!selectedProject ||
										!singleUploads[a.attorney_id] ||
										isUploading
									}
									aria-busy={isUploading}
								>
									Upload
								</button>
							</div>
						))}
						{selectedProject && (selectedAttorneys?.length || 0) === 0 && (
							<div className="status-msg">All attorneys in this project already have images.</div>
						)}
					</div>
				)}

				{mode === "batch" && (
					<div className="batch-upload-section">
						<div className="batch-upload-controls">
							<input
								type="file"
								multiple
								accept=".jpg,.jpeg,.png,image/jpeg,image/png"
								onChange={(e) => analyzeBatch(Array.from(e.target.files || []))}
								disabled={
									isUploading ||
									!selectedProject ||
									(selectedAttorneys?.length || 0) === 0
								}
							/>
							<button
								onClick={uploadAll}
								disabled={isUploading || rows.length === 0 || !selectedProject}
								aria-busy={isUploading}
							>
								{isUploading
									? `Uploading... (${progress.done}/${progress.total})`
									: `Upload ${readyCount} Matched File${readyCount !== 1 ? "s" : ""}`}
							</button>
						</div>

						{rows.length > 0 && (
							<>
								<div className="batch-summary">
									<span><strong>Total:</strong> {rows.length}</span>
									<span><strong>Ready:</strong> {rows.filter(r => r.status === "ready").length}</span>
									<span><strong>Needs Review:</strong> {rows.filter(r => r.status === "review").length}</span>
									<span><strong>Unmatched:</strong> {rows.filter(r => r.status === "unmatched").length}</span>
								</div>

								<div className="batch-table">
									<div className="batch-row batch-header">
										<div className="batch-title-img-name">Image</div>
										<div className="batch-title-detected-name">Detected Name</div>
										<div className="batch-title-suggestion-name">Matched Name</div>
										<div className="batch-title-suggestion-score">Match Score</div>
										<div className="batch-title-attorney-select">Choose / Confirm</div>
										<div className="batch-title-status-msg">Status</div>
									</div>

									{rows.map((r, idx) => (
										<div key={`${r.attorney_id}-${idx}`} className={`batch-row ${r.status}`}>
											{/* Image (chosen or top suggestion) */}
											<div className="batch-img-name" title={r.file?.name || ""}>
												{r.file?.name || <em>(choose a file)</em>}
											</div>

											{/* Detected filename base */}
											<div className="batch-detected-name">{r.base || "-"}</div>

											{/* Attorney (this row is for a specific attorney) */}
											<div className="batch-suggestion-name">{r.attorney_name}</div>

											{/* Score */}
											<div className="batch-suggestion-score">
												{r.scoreText || "-"}
											</div>

											{/* Choose/Confirm: list candidate files for this attorney */}
											<div>
												<select
													value={
														r.file
															? r.options.findIndex(o => o.file === r.file)
															: ""
													}
													onChange={(e) =>
														updateSelectionFile(idx, e.target.value === "" ? -1 : Number(e.target.value))
													}
													className="batch-attorney-select"
												>
													<option value="">Select file</option>
													{(r.options || []).map((opt, j) => (
														<option key={`${r.attorney_id}-opt-${j}`} value={j}>
															{opt.file.name} {opt.score >= 0.9 ? "✓" : ""}
														</option>
													))}
												</select>
											</div>

											{/* Status */}
											<div className="batch-status-msg">
												{r.result === "success" && <span className="ok">{r.msg || "Uploaded"}</span>}
												{r.result === "error" && <span className="err">{r.msg || "Failed"}</span>}
												{!r.result && (
													r.status === "ready" ? <span className="ready">Ready</span> :
														r.status === "review" ? <span className="review">Review</span> :
															<span className="unmatched">No Match</span>
												)}
											</div>
										</div>
									))}
								</div>
							</>
						)}

						{!isUploading && selectedProject && (selectedAttorneys?.length || 0) === 0 && (
							<div className="status-msg">Nothing to upload — this project has no missing images.</div>
						)}
					</div>
				)}

				{statusMsg && <div className="status-msg">{statusMsg}</div>}
			</div>
		</div>
	);
};

export default UploadImages;
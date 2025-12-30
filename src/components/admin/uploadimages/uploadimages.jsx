import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./uploadimages.module.css";

const UploadImages = () => {
	const {
		selectedProject,
		setSelectedProject,
		attorneys = [],
		availableProjects = [],
		setMissingImages,
		refresh,
	} = useOutletContext() || {};

	const [mode, setMode] = useState("single");
	const [statusMsg, setStatusMsg] = useState("");
	const [isUploading, setIsUploading] = useState(false);

	const [rows, setRows] = useState([]);
	const [progress, setProgress] = useState({ done: 0, total: 0 });
	const [singleUploads, setSingleUploads] = useState({});
	const [selectedAttorneys, setSelectedAttorneys] = useState([]);

	useEffect(() => {
		const reload = async () => {
			setStatusMsg("");
			setRows([]);
			setSingleUploads({});
			setSelectedAttorneys([]);
			if (selectedProject) {
				await fetchMissingForProject(selectedProject);
			}
		};
		reload();
	}, [selectedProject]);

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
	const STATUS_ORDER = { unmatched: 0, review: 1, ready: 2 };

	const sortRows = (arr) =>
		[...arr].sort((a, b) => {
			const ra = STATUS_ORDER[a.status] ?? 99;
			const rb = STATUS_ORDER[b.status] ?? 99;
			if (ra !== rb) return ra - rb;
			const an = a.attorney_name || "";
			const bn = b.attorney_name || "";
			return an.localeCompare(bn, undefined, { sensitivity: "base" });
		});

	const pruneUploaded = useCallback(
		(okIds, delay = 0) => {
			if (!okIds?.length) return;
			const ok = new Set(okIds.map(String));

			const doPrune = () => {
				setSingleUploads((prev) => {
					const next = { ...prev };
					okIds.forEach((id) => delete next[id]);
					return next;
				});

				setRows((prev) => prev.filter((r) => !ok.has(String(r.attorney_id))));
				setSelectedAttorneys((prev) => prev.filter((a) => !ok.has(String(a.attorney_id))));
			};

			delay ? setTimeout(doPrune, delay) : doPrune();
		},
		[setRows, setSingleUploads, setSelectedAttorneys]
	);

	const fetchMissingForProject = async (projectName) => {
		if (!projectName) {
			setSelectedAttorneys([]);
			return;
		}
		try {
			setStatusMsg("");
			const { data } = await api.get("/admin/shortlist/check-images", {
				params: { project_name: projectName },
				admin: true,
			});

			const missing = Array.isArray(data?.attorneys) ? data.attorneys : [];
			const localByName = new Map(
				(attorneys || []).map((a) => [normalize(getName(a)), { ...a, name: getName(a) }])
			);

			const selected = missing.map((m) => {
				const nm = normalize(getName(m));
				const local = localByName.get(nm);
				return {
					...(local || {}),
					name: getName(m),
					attorney_id: m.attorney_id,
				};
			});

			setSelectedAttorneys(selected);
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
		return (selectedAttorneys || []).map((a) => {
			const name = getName(a);
			const n = normalize(name);
			const parts = n.split(" ").filter(Boolean);
			const lastFirst =
				parts.length >= 2 ? `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}` : n;
			const noMiddle = parts.length >= 3 ? `${parts[0]} ${parts[parts.length - 1]}` : n;

			return { ...a, name, _n: n, _v: new Set([n, lastFirst, noMiddle]) };
		});
	}, [selectedAttorneys]);

	const analyzeBatch = useCallback(
		(files) => {
			const HIGH = 0.93;
			const LOW = 0.82;
			const MARGIN = 0.05;

			const fileList = (files || []).map((f) => ({ file: f, base: filenameBase(f.name) }));

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

			setRows(sortRows(nextRows));
			setProgress({ done: 0, total: nextRows.length });
			setStatusMsg("");
		},
		[selectedAttorneys, normalize, jaroWinkler]
	);

	const updateSelectionFile = (rowIdx, optionIdx) => {
		setRows((prev) => {
			const next = [...prev];
			const row = { ...next[rowIdx] };
			row.result = null;
			row.msg = "";

			const hasOptions = Array.isArray(row.options) && row.options.length > 0;

			if (!hasOptions || optionIdx < 0 || optionIdx >= row.options.length) {
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
				row.status = "ready";
			}

			next[rowIdx] = row;
			return next;
		});
	};

	const uploadAll = async () => {
		const ready = rows
			.map((r, i) => ({ ...r, idx: i }))
			.filter((r) => r.status === "ready" && r.file);
		if (ready.length === 0) return;

		const allowedExts = new Set(["jpg", "jpeg", "png"]);
		const filtered = ready.filter((r) => {
			const ext = (r.file?.name?.split(".").pop() || "").toLowerCase();
			return allowedExts.has(ext);
		});

		if (filtered.length === 0) {
			setRows((prev) => {
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

			const res = await api.post("/admin/attorney/upload-attorney-image-batch", formData, {
				headers: { "Content-Type": "multipart/form-data" },
				admin: true,
			});

			const results = Array.isArray(res?.data?.results) ? res.data.results : [];

			setRows((prev) => {
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
				return sortRows(next);
			});

			if (typeof setMissingImages === "function") {
				results.forEach((r, i) => {
					if (r.status === "uploaded" || r.status === "skipped_existing") {
						const attorneyId = metas[i].attorney_id;
						setMissingImages((prev) =>
							prev.map((a) => (a.attorney_id === attorneyId ? { ...a, name: "SUCCESS" } : a))
						);
						setTimeout(() => {
							setMissingImages((prev) => prev.filter((a) => a.attorney_id !== attorneyId));
						}, 3000);
					}
				});
			}

			const okIds = results.flatMap((r, i) =>
				r?.status === "uploaded" || r?.status === "skipped_existing" ? [metas[i].attorney_id] : []
			);

			setProgress({ done: filtered.length, total: filtered.length });
			setStatusMsg("batch upload finished");
			pruneUploaded(okIds, 800);
		} catch (err) {
			console.error("batch upload failed:", err?.response?.data || err.message);
			setRows((prev) => {
				const next = [...prev];
				filtered.forEach((r) => {
					next[r.idx] = { ...next[r.idx], result: "error", msg: "Failed" };
				});
				return next;
			});
			setStatusMsg("upload failed");
		} finally {
			setIsUploading(false);
			await refresh?.();
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
			await api.post("/admin/attorney/upload-attorney-image", formData, {
				headers: { "Content-Type": "multipart/form-data" },
				admin: true,
			});
			setStatusMsg("upload successful");
			pruneUploaded([attorneyId], 700);
		} catch (err) {
			console.error(err);
			setStatusMsg("upload failed: " + (err?.response?.data || "server error"));
		} finally {
			setIsUploading(false);
			await refresh?.();
		}
	};

	const readyCount = rows.filter((r) => r.status === "ready" && !!r.file).length;

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.sectionTitle}>Upload Attorney Images</div>

				<div className={styles.form}>
					<label className={styles.inline}>
						Project:&nbsp;
						<select
							value={selectedProject || ""}
							onChange={(e) => setSelectedProject?.(e.target.value || null)}
						>
							<option value="">Select Project</option>
							{availableProjects.map((p, i) => (
								<option key={`${p}-${i}`} value={p}>
									{p}
								</option>
							))}
						</select>
					</label>

					<div className={styles.modeToggle}>
						<button
							type="button"
							className={`${styles.btn} ${mode === "single" ? styles.active : ""}`}
							onClick={() => setMode("single")}
							disabled={!selectedProject}
						>
							Single
						</button>
						<button
							type="button"
							className={`${styles.btn} ${mode === "batch" ? styles.active : ""}`}
							onClick={() => setMode("batch")}
							disabled={!selectedProject}
						>
							Batch
						</button>
					</div>

					{mode === "single" && (
						<div className={styles.singleList}>
							{(selectedAttorneys || []).map((a, idx) => (
								<div key={a.attorney_id || `name:${a.name}-${idx}`} className={styles.singleRow}>
									<span className={styles.nameCell}>{a.name}</span>
									<input
										className={styles.fileInput}
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
										className={`${styles.btn} ${styles.primaryBtn}`}
										onClick={() => uploadSingle(a.attorney_id, singleUploads[a.attorney_id])}
										disabled={!selectedProject || !singleUploads[a.attorney_id] || isUploading}
										aria-busy={isUploading}
									>
										Upload
									</button>
								</div>
							))}
							{selectedProject && (selectedAttorneys?.length || 0) === 0 && (
								<div className={styles.statusMsg}>All attorneys in this project already have images.</div>
							)}
						</div>
					)}

					{mode === "batch" && (
						<div className={styles.batchSection}>
							<div className={styles.batchControls}>
								<input
									className={styles.fileInput}
									type="file"
									multiple
									accept=".jpg,.jpeg,.png,image/jpeg,image/png"
									onChange={(e) => analyzeBatch(Array.from(e.target.files || []))}
									disabled={isUploading || !selectedProject || (selectedAttorneys?.length || 0) === 0}
								/>
								<button
									className={`${styles.btn} ${styles.primaryBtn}`}
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
									<div className={styles.batchSummary}>
										<span>
											<strong>Total:</strong> {rows.length}
										</span>
										<span>
											<strong>Ready:</strong> {rows.filter((r) => r.status === "ready").length}
										</span>
										<span>
											<strong>Needs Review:</strong> {rows.filter((r) => r.status === "review").length}
										</span>
										<span>
											<strong>Unmatched:</strong> {rows.filter((r) => r.status === "unmatched").length}
										</span>
									</div>

									<div className={styles.batchTable}>
										<div className={`${styles.batchRow} ${styles.header}`}>
											<div className={styles.batchTitle}>Image</div>
											<div className={styles.batchTitle}>Detected Name</div>
											<div className={styles.batchTitle}>Matched Name</div>
											<div className={styles.batchTitle}>Match Score</div>
											<div className={styles.batchTitle}>Choose / Confirm</div>
											<div className={styles.batchTitle}>Status</div>
										</div>

										{rows.map((r, idx) => (
											<div
												key={`${r.attorney_id}-${idx}`}
												className={`${styles.batchRow} ${r.status === "ready"
													? styles.ready
													: r.status === "review"
														? styles.review
														: styles.unmatched
													}`}
											>
												<div className={styles.truncCell} title={r.file?.name || ""}>
													{r.file?.name || <em>(choose a file)</em>}
												</div>

												<div className={styles.truncCell}>{r.base || "-"}</div>
												<div className={styles.truncCell}>{r.attorney_name}</div>
												<div className={styles.centerCell}>{r.scoreText || "-"}</div>

												<div>
													<select
														className={styles.batchSelect}
														value={r.file ? r.options.findIndex((o) => o.file === r.file) : ""}
														onChange={(e) =>
															updateSelectionFile(idx, e.target.value === "" ? -1 : Number(e.target.value))
														}
													>
														<option value="">Select file</option>
														{(r.options || []).map((opt, j) => (
															<option key={`${r.attorney_id}-opt-${j}`} value={j}>
																{opt.file.name} {opt.score >= 0.9 ? "✓" : ""}
															</option>
														))}
													</select>
												</div>

												<div className={styles.statusCell}>
													{r.result === "success" && <span className={styles.ok}>Uploaded</span>}
													{r.result === "error" && <span className={styles.err}>{r.msg || "Failed"}</span>}
													{!r.result &&
														(r.status === "ready" ? (
															<span className={styles.readyChip}>Ready</span>
														) : r.status === "review" ? (
															<span className={styles.reviewChip}>Review</span>
														) : (
															<span className={styles.unmatchedChip}>No Match</span>
														))}
												</div>
											</div>
										))}
									</div>
								</>
							)}

							{!isUploading && selectedProject && (selectedAttorneys?.length || 0) === 0 && (
								<div className={styles.statusMsg}>Nothing to upload — this project has no missing images.</div>
							)}
						</div>
					)}

					<div className={styles.statusMsg}>{statusMsg}</div>
				</div>
			</div>
		</div>
	);
};

export default UploadImages;
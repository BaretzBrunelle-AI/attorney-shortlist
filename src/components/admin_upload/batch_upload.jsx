import { useMemo, useState, useCallback } from "react";
import api from "../../config/axios_config";

import "./batch_upload.css";

const BatchImageUploader = ({ attorneys = [], setMissingImages, disabled = false }) => {
	const [files, setFiles] = useState([]);
	const [rows, setRows] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState({ done: 0, total: 0 });

	const normalize = (s) =>
		s
			?.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\s]/g, " ")
			.replace(/\b(esq|jr|sr|ii|iii|iv)\b/g, "")
			.replace(/\s+/g, " ")
			.trim() || "";

	const filenameBase = (name) => (name || "").replace(/\.[^.]+$/i, "");

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
		const attys = attorneys.map((a) => {
			const n = normalize(a.name);
			const parts = n.split(" ").filter(Boolean);
			const lastFirst = parts.length >= 2 ? `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}` : n;
			const noMiddle = parts.length >= 3 ? `${parts[0]} ${parts[parts.length - 1]}` : n;

			return { ...a, _n: n, _v: new Set([n, lastFirst, noMiddle]) };
		});
		return attys;
	}, [attorneys]);

	const rank = useCallback(
		(needleRaw) => {
			const needle = normalize(needleRaw);
			if (!needle) return [];
			const scored = [];
			for (const a of index) {
				let s = 0;
				for (const v of a._v) s = Math.max(s, jaroWinkler(needle, v));
				scored.push({ attorney_id: a.attorney_id, name: a.name, score: s });
			}
			scored.sort((x, y) => y.score - x.score);
			return scored.slice(0, 5);
		},
		[index]
	);

	const analyze = useCallback(
		(selectedFiles) => {
			const HIGH = 0.93;
			const LOW = 0.82;

			const rows = [];
			for (const f of selectedFiles) {
				const base = filenameBase(f.name);
				const candidates = rank(base);

				let status = "review";
				let suggestion = null;
				let selectedId = null;

				if (candidates.length === 0 || candidates[0].score < LOW) {
					status = "unmatched";
				} else if (candidates[0].score >= HIGH && (candidates[1]?.score ?? 0) < HIGH - 0.04) {
					status = "ready";
					suggestion = candidates[0];
					selectedId = candidates[0].attorney_id;
				} else {
					status = "review";
					suggestion = candidates[0];
					selectedId = candidates[0].attorney_id;
				}

				rows.push({
					file: f,
					base,
					suggestion,
					score: suggestion?.score ?? 0,
					options: candidates,
					selectedId,
					status,
					result: null,
					msg: "",
				});
			}
			setRows(rows);
			setProgress({ done: 0, total: rows.length });
		},
		[rank]
	);

	const onFilesChosen = (e) => {
		const list = Array.from(e.target.files || []);
		setFiles(list);
		analyze(list);
	};

	const updateSelection = (idx, newId) => {
		setRows((prev) => {
			const next = [...prev];
			const row = { ...next[idx] };
			row.selectedId = newId || null;
			row.status = newId ? "ready" : "unmatched";
			next[idx] = row;
			return next;
		});
	};

	// 🚀 New: single batch request to the proper endpoint
	const uploadAll = async () => {
		const ready = rows
			.map((r, i) => ({ ...r, idx: i }))
			.filter((r) => r.status === "ready" && r.selectedId);

		if (ready.length === 0) return;

		// client-side extension guard (matches server’s allowlist)
		const allowedExts = new Set(["jpg", "jpeg", "png"]);
		const filtered = ready.filter((r) => {
			const ext = (r.file.name.split(".").pop() || "").toLowerCase();
			return allowedExts.has(ext);
		});

		if (filtered.length === 0) {
			// mark all as error if none pass the extension filter
			setRows((prev) => {
				const next = [...prev];
				ready.forEach((r) => {
					next[r.idx] = { ...next[r.idx], result: "error", msg: "Unsupported file type" };
				});
				return next;
			});
			return;
		}

		setUploading(true);
		setProgress({ done: 0, total: filtered.length });

		try {
			const formData = new FormData();
			const metas = [];

			// keep input order to map results back
			filtered.forEach(({ file, selectedId }) => {
				formData.append("files", file);
				metas.push({ attorney_id: selectedId });
			});
			formData.append("metas", JSON.stringify(metas));

			const res = await api.post("/admin/upload-attorney-image-batch", formData, {
				headers: { "Content-Type": "multipart/form-data" },
				admin: true,
			});

			const results = Array.isArray(res?.data?.results) ? res.data.results : [];

			// Map results (which are in the same order we sent) back to original row indices
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
				return next;
			});

			// Update the “missing images” list for successes
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

			setProgress({ done: filtered.length, total: filtered.length });
		} catch (err) {
			console.error("Batch upload failed:", err?.response?.data || err.message);
			// mark those as failed
			setRows((prev) => {
				const next = [...prev];
				filtered.forEach((r) => {
					next[r.idx] = { ...next[r.idx], result: "error", msg: "Failed" };
				});
				return next;
			});
		} finally {
			setUploading(false);
		}
	};

	const readyCount = rows.filter((r) => r.status === "ready" && r.selectedId).length;
	const reviewCount = rows.filter((r) => r.status === "review").length;
	const unmatchedCount = rows.filter((r) => r.status === "unmatched").length;

	return (
		<div className="batch-uploader-container">
			<div className="section-title">Batch Upload Attorney Images</div>

			<input
				type="file"
				accept=".jpg,.jpeg,.png,image/jpeg,image/png"
				multiple
				onChange={onFilesChosen}
				disabled={disabled}
				className="batch-file-input"
			/>

			<div className="batch-actions">
				<button
					onClick={uploadAll}
					disabled={disabled || uploading || readyCount === 0}
					className="batch-upload-button"
					aria-busy={uploading}
				>
					{uploading
						? `Uploading... (${progress.done}/${progress.total})`
						: `Upload ${readyCount} Matched File${readyCount !== 1 ? "s" : ""}`}
				</button>
			</div>

			{rows.length > 0 && (
				<>
					<div className="batch-summary">
						<span><strong>Total:</strong> {rows.length}</span>
						<span><strong>Ready:</strong> {readyCount}</span>
						<span><strong>Needs Review:</strong> {reviewCount}</span>
						<span><strong>Unmatched:</strong> {unmatchedCount}</span>
					</div>

					<div className="batch-table">
						<div className="batch-row batch-header">
							<div>Image</div>
							<div>Detected Name</div>
							<div>Suggested Attorney</div>
							<div>Confidence</div>
							<div>Choose / Confirm</div>
							<div>Status</div>
						</div>

						{rows.map((r, idx) => (
							<div key={idx} className={`batch-row ${r.status}`}>
								<div title={r.file.name}>{r.file.name}</div>
								<div>{r.base}</div>
								<div>{r.suggestion ? r.suggestion.name : <em>None</em>}</div>
								<div>{r.suggestion ? r.suggestion.score.toFixed(3) : "-"}</div>
								<div>
									<select
										value={r.selectedId || ""}
										onChange={(e) => updateSelection(idx, e.target.value || null)}
									>
										<option value="">-- Select attorney --</option>
										{r.options.map((opt) => (
											<option key={opt.attorney_id} value={opt.attorney_id}>
												{opt.name} {opt.score >= 0.9 ? "✓" : ""}
											</option>
										))}
									</select>
								</div>
								<div>
									{r.result === "success" && <span className="ok">{r.msg || "Uploaded"}</span>}
									{r.result === "error" && <span className="err">{r.msg || "Failed"}</span>}
									{!r.result &&
										(r.status === "ready" ? (
											<span className="ready">Ready</span>
										) : r.status === "review" ? (
											<span className="review">Needs review</span>
										) : (
											<span className="unmatched">Unmatched</span>
										))}
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default BatchImageUploader;
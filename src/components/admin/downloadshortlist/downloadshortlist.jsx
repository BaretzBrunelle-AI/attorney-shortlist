import React, { useState } from "react";
import api from "../../../config/axios_config.jsx";
import styles from "./DownloadShortlist.module.css";

const DownloadShortlist = ({ selectedProject }) => {
	const [downloading, setDownloading] = useState(false);
	const [marqueeStart, setMarqueeStart] = useState("0");
	const [firstClassStart, setFirstClassStart] = useState("0");
	const [wildcardStart, setWildcardStart] = useState("0");

	const handleDownloadShortlist = async () => {
		if (!selectedProject || downloading) return;
		setDownloading(true);
		try {
			const res = await api.post(
				"/dashboard/download-shortlist",
				{
					project_title: selectedProject,
					marquee_start: marqueeStart,
					firstclass_start: firstClassStart,
					wildcard_start: wildcardStart,
				},
				{
					responseType: "arraybuffer",
					admin: true,
				}
			);

			const type = res.headers["content-type"] || "application/pdf";
			const blob = new Blob([res.data], { type });

			let filename = `${selectedProject.replace(/\s+/g, "_")}_attorneys.pdf`;
			const dispo = res.headers["content-disposition"];
			const m = dispo && /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
			if (m && m[1]) filename = decodeURIComponent(m[1]);

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error downloading shortlist:", err);
			alert("Failed to download shortlist. Please try again.");
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.pageNumberInputs}>
				<label>
					Marquee Start:
					<input
						className={styles.pageNumInput}
						type="text"
						value={marqueeStart}
						onChange={(e) => setMarqueeStart(e.target.value)}
						placeholder="No Page Numbers"
					/>
				</label>

				<label>
					First Class Start:
					<input
						className={styles.pageNumInput}
						type="text"
						value={firstClassStart}
						onChange={(e) => setFirstClassStart(e.target.value)}
						placeholder="No Page Numbers"
					/>
				</label>

				<label>
					Wildcard Start:
					<input
						className={styles.pageNumInput}
						type="text"
						value={wildcardStart}
						onChange={(e) => setWildcardStart(e.target.value)}
						placeholder="No Page Numbers"
					/>
				</label>
			</div>

			<button
				type="button"
				className={styles.downloadButton}
				onClick={handleDownloadShortlist}
				disabled={!selectedProject || downloading}
			>
				{downloading ? <span className={styles.spinner} aria-hidden="true" /> : "Download Project Shortlist"}
			</button>
		</div>
	);
};

export default DownloadShortlist;
import React, { useState } from "react";
import api from "../../../config/axios_config.jsx";
import styles from "./downloadshortlist.module.css";

const DownloadShortlist = ({ selectedProject, isOpen, onClose }) => {
	const [downloading, setDownloading] = useState(false);
	const [marqueeStart, setMarqueeStart] = useState("0");
	const [firstClassStart, setFirstClassStart] = useState("0");
	const [wildcardStart, setWildcardStart] = useState("0");

	if (!isOpen) return null;

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
			const m =
				dispo &&
				/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
			if (m && m[1]) filename = decodeURIComponent(m[1]);

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);

			onClose?.();
		} catch (err) {
			console.error("error downloading shortlist:", err);
			alert("failed to download shortlist. please try again.");
		} finally {
			setDownloading(false);
		}
	};

	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget && !downloading) {
			onClose?.();
		}
	};

	return (
		<div
			className={styles.modalOverlay}
			onClick={handleOverlayClick}
			role="presentation"
		>
			<div
				className={styles.modal}
				role="dialog"
				aria-modal="true"
				aria-labelledby="download-shortlist-title"
			>
				<div className={styles.modalHeader}>
					<div className={styles.modalTitle} id="download-shortlist-title">
						Download Shortlist PDF
					</div>
					<button
						type="button"
						className={styles.closeButton}
						onClick={() => !downloading && onClose?.()}
						aria-label="close"
					>
						×
					</button>
				</div>

				<div className={styles.modalBody}>
					<div className={styles.modalSubtitle}>
						{selectedProject
							? `Project: ${selectedProject}`
							: "no project selected"}
					</div>

					<div className={styles.pageNumberInputs}>
						<label>
							Marquee start
							<input
								className={styles.pageNumInput}
								type="text"
								value={marqueeStart}
								onChange={(e) => setMarqueeStart(e.target.value)}
								placeholder="no page numbers"
								disabled={downloading}
							/>
						</label>

						<label>
							First Class start
							<input
								className={styles.pageNumInput}
								type="text"
								value={firstClassStart}
								onChange={(e) => setFirstClassStart(e.target.value)}
								placeholder="no page numbers"
								disabled={downloading}
							/>
						</label>

						<label>
							Wildcard start
							<input
								className={styles.pageNumInput}
								type="text"
								value={wildcardStart}
								onChange={(e) => setWildcardStart(e.target.value)}
								placeholder="no page numbers"
								disabled={downloading}
							/>
						</label>
					</div>
				</div>

				<div className={styles.modalFooter}>
					<button
						type="button"
						className={styles.secondaryButton}
						onClick={() => !downloading && onClose?.()}
						disabled={downloading}
					>
						Cancel
					</button>
					<button
						type="button"
						className={styles.downloadButton}
						onClick={handleDownloadShortlist}
						disabled={!selectedProject || downloading}
					>
						{downloading ? (
							<span className={styles.spinner} aria-hidden="true" />
						) : (
							"Download PDF"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default DownloadShortlist;
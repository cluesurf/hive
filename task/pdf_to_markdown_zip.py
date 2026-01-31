import sys
import fitz  # PyMuPDF
import zipfile
from pathlib import Path
import json
import re

if len(sys.argv) != 2:
    print("Usage: python pdf_to_markdown_zip.py <file.pdf>")
    sys.exit(1)

PDF_PATH = Path(sys.argv[1])
if not PDF_PATH.exists():
    print("File not found:", PDF_PATH)
    sys.exit(1)

BASE_NAME = PDF_PATH.stem
OUT_DIR = Path(f"{BASE_NAME}_markdown")
PAGES_DIR = OUT_DIR / "pages"
IMAGES_DIR = OUT_DIR / "images"

OUT_DIR.mkdir(exist_ok=True)
PAGES_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)

print("Opening PDF...")
doc = fitz.open(PDF_PATH)

metadata = {
    "title": doc.metadata.get("title"),
    "author": doc.metadata.get("author"),
    "producer": doc.metadata.get("producer"),
    "pages": len(doc),
    "source_pdf": str(PDF_PATH.name),
}

def clean_text(text):
    text = text.replace("\u00a0", " ")
    text = re.sub(r'\s+\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def looks_like_heading(text):
    if len(text) > 120:
        return False
    if text.isupper():
        return True
    if re.match(r'^(chapter|section|part)\b', text.lower()):
        return True
    if re.match(r'^\d+(\.\d+)*\s+\w+', text):
        return True
    return False

full_book = [
    f"# {metadata['title'] or BASE_NAME}",
    "",
    f"**Author:** {metadata['author'] or 'Unknown'}",
    f"**Pages:** {metadata['pages']}",
    "",
    "_Converted automatically from PDF to Markdown._",
    ""
]

for i in range(len(doc)):
    page = doc[i]
    page_no = i + 1
    print(f"Processing page {page_no}/{len(doc)}")

    page_lines = [f"# Page {page_no}", ""]

    blocks = page.get_text("blocks")
    blocks.sort(key=lambda b: (b[1], b[0]))

    for block in blocks:
        text = clean_text(block[4])
        if not text:
            continue

        if looks_like_heading(text):
            page_lines.append(f"## {text}")
        else:
            page_lines.append(text)

        page_lines.append("")

    # Extract images
    for img_index, img in enumerate(page.get_images(full=True), start=1):
        xref = img[0]
        base_image = doc.extract_image(xref)
        ext = base_image["ext"]
        img_bytes = base_image["image"]

        img_name = f"page-{page_no:04d}-img-{img_index:02d}.{ext}"
        img_path = IMAGES_DIR / img_name
        with open(img_path, "wb") as f:
            f.write(img_bytes)

        page_lines.append(f"![Image from page {page_no}](../images/{img_name})")
        page_lines.append("")

    page_md = "\n".join(page_lines).strip() + "\n"
    (PAGES_DIR / f"{page_no:04d}.md").write_text(page_md, encoding="utf-8")

    full_book.append(page_md)
    full_book.append("\n")

# Save full book
(OUT_DIR / "book.md").write_text("\n".join(full_book), encoding="utf-8")

# Save metadata
(OUT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

# Create zip
zip_path = Path(f"{BASE_NAME}_markdown.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for file in OUT_DIR.rglob("*"):
        z.write(file, file.relative_to(OUT_DIR.parent))

print("Done.")
print("Markdown folder:", OUT_DIR)
print("Zip archive:", zip_path)

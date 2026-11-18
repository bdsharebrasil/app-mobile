import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "dropzone-upload",
  "name": "Dropzone upload",
  "family": "inputs",
  "summary": "A file-upload area supporting both drag-and-drop and a file-browse control.",
  "whenToUse": [
    "Upload files with a visible landing area and progress rows.",
    "Provide drag convenience with a reliable browse alternative; use progress-bar for upload status alone."
  ],
  "avoidWhen": [
    "Dragging existing items to change their order: use drag-reorder.",
    "Removing already uploaded content: use swipe-delete with an explicit delete action."
  ],
  "promptTerm": "accessible file-upload dropzone",
  "promptExample": "Use the \u201caccessible file-upload dropzone\u201d pattern to build a file dropzone with drag-over highlighting, a browse button backed by a native file input, per-file upload progress, validation errors, and named remove buttons.",
  "aliases": [
    "Dropzone",
    "File drop area",
    "Upload zone"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 220,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 160,
      "easing": "cubic-bezier(0.4,0,1,1)"
    },
    {
      "phase": "reduced-motion",
      "ms": 0,
      "easing": "linear"
    }
  ],
  "loopMs": 5000,
  "a11y": [
    "Provide a named keyboard-operable Browse button and native file input; dropping is never required.",
    "State allowed types, size/count limits, and actual validation errors in text.",
    "Expose each file's name, progress, and a uniquely named remove button; announce additions/errors politely.",
    "Keep focus stable after adding files; move focus to a surviving row/control if removal deletes the focused button.",
    "Reduced motion: Apply drag-over style and add/remove rows in 0 ms; no scaling or height animation."
  ],
  "primitives": [
    "Native HTML file input and progress (no additional library)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

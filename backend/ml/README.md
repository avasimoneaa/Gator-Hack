# Experimental ML gaze-mode assist

This optional hackathon feature estimates whether recent gaze resembles a focused visual task. It uses five simple signals: how far gaze moves horizontally and vertically, its movement speed, and its average screen position. The estimate never chooses a button or confirms an action.

## Data used

- **MCFW-Gaze** (released February 21, 2026; CC BY 4.0): 15 Tobii Pro Fusion participants, including password-entry and natural-image viewing tasks. [Dataset and citation](https://doi.org/10.5281/zenodo.18725479).
- **GazeTypeBD** (released October 8, 2026; CC BY 4.0): 41 participants using WebGazer webcam tracking during eye typing. The trainer samples at most 12 one-second windows per participant, normalizes screen coordinates using the dataset's calibration-grid bounds, and keeps participants separate between training and evaluation. [Dataset](https://data.mendeley.com/datasets/4m2pm5hp9j/1).

GazeTypeBD provides webcam examples of focused typing, but it does not label iSpeak button choices. Its contribution is a domain-adaptation hint, not evidence of better button selection.

## Reproduce training

From the repository root, download the small required dataset subsets and train the model:

```powershell
node .\backend\ml\download_mcfw_subset.mjs
node .\backend\ml\download_gazetypebd_subset.mjs
python .\backend\ml\train_gaze_mode.py
```

The downloaders use HTTP range requests to fetch gaze and calibration files without downloading the large video archive. Raw recordings are ignored by Git. The trainer writes `frontend/src/gaze-intent-model.json`.

## Current result

The trainer uses 114 MCFW training windows and 348 sampled GazeTypeBD windows. Each GazeTypeBD window has sample weight 0.025 compared with 1.0 for MCFW, and the same weights are used when scaling features so the webcam recordings do not overwhelm the small Tobii benchmark.

- MCFW participant-held-out balanced accuracy: **0.819** (62 windows), compared with **0.826** for the previous model on the same split.
- On 144 held-out GazeTypeBD typing windows, the previous model fell below the app's 0.20 extra-delay threshold 40.3% of the time; the updated model did so 23.6% of the time. At 0.35, the rates were 51.4% and 35.4%.
- None of the held-out MCFW structured-task windows fell below 0.20 in this small evaluation.

With the optional assist enabled, ordinary gaze selections receive an extra 500 ms only when the latest fresh estimate is below 0.20. That stricter threshold is intended to reduce unnecessary slowdowns during task-focused gaze. Confirmation timing remains separate. With the assist off, normal configured dwell time applies.

These are offline dataset results, not measurements of iSpeak selection accuracy or real-user responsiveness. The MCFW held-out group is small and uses a Tobii tracker; GazeTypeBD is webcam eye typing rather than iSpeak use. The model can still misclassify gaze patterns and should remain optional until evaluated with actual iSpeak webcam sessions and AAC users. Do not describe it as intent detection or clinical validation.

## Attribution

Nagasawa, J., Isomoto, T., Hiroe, M., & Nagamatsu, T. (2026). *MCFW-Gaze: MultiContext Free-Web Gaze Dataset*. Zenodo. https://doi.org/10.5281/zenodo.18725479. CC BY 4.0.

*GazeTypeBD: A Dataset for Eye Typing through Webcam-Based Gaze Tracking*. Mendeley Data, Version 1 (2026). https://doi.org/10.17632/4m2pm5hp9j.1. CC BY 4.0.

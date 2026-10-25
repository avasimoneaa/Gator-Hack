"""Train a small, explainable gaze-mode prototype from MCFW-Gaze and GazeTypeBD.

The model distinguishes structured gaze tasks from natural-image free viewing.
This is a task-mode signal, not a clinical measure or stand-alone click gate.
Uses only Python's standard library.
"""
import csv
import json
import math
import random
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "data" / "raw"
MODEL_OUT = HERE.parent.parent / "frontend" / "src" / "gaze-intent-model.json"
RNG = random.Random(7)
WINDOW_SECONDS = 1.0
GAZETYPE_RAW = HERE / "data" / "gazetypebd" / "raw"
GAZETYPE_WINDOWS_PER_PERSON = 12
MCFW_TRAIN_PEOPLE = {"participant_002", "participant_004", "participant_005", "participant_008", "participant_009", "participant_010", "participant_012", "participant_013", "participant_014", "participant_015"}


def gaze_points(path):
    points = []
    with path.open(newline="", encoding="utf-8") as source:
        for row in csv.DictReader(source, delimiter="\t"):
            timestamp = row.get("device_time_stamp")
            if not timestamp:
                continue
            eyes = []
            for side in ("left", "right"):
                if row.get(f"{side}_gaze_point_valid", "").lower() != "true":
                    continue
                try:
                    x = float(row[f"{side}_gaze_point_on_display_area_x"])
                    y = float(row[f"{side}_gaze_point_on_display_area_y"])
                except (KeyError, TypeError, ValueError):
                    continue
                if math.isfinite(x) and math.isfinite(y) and 0 <= x <= 1 and 0 <= y <= 1:
                    eyes.append((x, y))
            if eyes:
                points.append((int(timestamp), statistics.mean(x for x, _ in eyes), statistics.mean(y for _, y in eyes)))
    return points


def features(window):
    xs = [point[1] for point in window]
    ys = [point[2] for point in window]
    duration = max((window[-1][0] - window[0][0]) / 1_000_000, 0.001)
    path_length = sum(math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) for i in range(1, len(window)))
    gaps = [(window[i][0] - window[i - 1][0]) / 1_000_000 for i in range(1, len(window))]
    return [statistics.pstdev(xs), statistics.pstdev(ys), path_length / duration, statistics.mean(xs), statistics.mean(ys)]


def windows(points, label, person):
    if not points:
        return []
    start = points[0][0]
    groups = {}
    for point in points:
        index = int((point[0] - start) / (WINDOW_SECONDS * 1_000_000))
        groups.setdefault(index, []).append(point)
    return [(features(group), label, person) for group in groups.values() if len(group) >= 30]


def load_rows():
    rows = []
    for person_dir in sorted(RAW.glob("participant_*")):
        person = person_dir.name
        structured = person_dir / "password_experiment_block1.tsv"
        free_view = person_dir / "image_20_1.tsv"
        if structured.exists():
            rows.extend(windows(gaze_points(structured), 1, person))
        if free_view.exists():
            rows.extend(windows(gaze_points(free_view), 0, person))
    return rows




def load_gazetype_rows():
    """Sample WebGazer task windows; all recordings from one person stay together."""
    rows_by_person = {}
    for person_dir in sorted(GAZETYPE_RAW.glob("P[0-9][0-9][0-9]")):
        person = person_dir.name
        person_rows = []
        # Calibration points span 14.45..1831.55 x 14.45..949.55; use
        # the matching 1846 x 964 browser viewport for scale-independent units.
        for path in sorted(person_dir.glob("word*/gaze_enriched.csv")):
            points = []
            with path.open(newline="", encoding="utf-8-sig") as source:
                first = source.readline()
                if first.strip().lower() != "sep=,":
                    source.seek(0)
                for row in csv.DictReader(source):
                    try:
                        timestamp = float(row["ts"])
                        x = float(row["x"]) / 1846.0
                        y = float(row["y"]) / 964.0
                    except (KeyError, TypeError, ValueError):
                        continue
                    if math.isfinite(timestamp) and math.isfinite(x) and math.isfinite(y):
                        points.append((int(timestamp * 1000), x, y))
            if not points:
                continue
            start = points[0][0]
            groups = {}
            for point in points:
                index = int((point[0] - start) / (WINDOW_SECONDS * 1_000_000))
                groups.setdefault(index, []).append(point)
            person_rows.extend((features(group), 1, person) for group in groups.values() if len(group) >= 6)
        if person_rows:
            RNG.shuffle(person_rows)
            rows_by_person[person] = person_rows[:GAZETYPE_WINDOWS_PER_PERSON]
    people = sorted(rows_by_person)
    RNG.shuffle(people)
    split = max(1, round(len(people) * 0.7))
    train_people, held_people = set(people[:split]), set(people[split:])
    train = [row for person in sorted(train_people) for row in rows_by_person[person]]
    held = [row for person in sorted(held_people) for row in rows_by_person[person]]
    return train, held, sorted(train_people), sorted(held_people)

def train_logistic(train_x, train_y, means, scales, sample_weights=None, iterations=1800):
    weights = [0.0] * (len(means) + 1)
    rate = 0.08
    penalty = 0.015
    sample_weights = sample_weights or [1.0] * len(train_x)
    weight_total = max(1.0, sum(sample_weights))
    for _ in range(iterations):
        gradient = [0.0] * len(weights)
        for row, label, sample_weight in zip(train_x, train_y, sample_weights):
            normalized = [(row[i] - means[i]) / scales[i] for i in range(len(means))]
            z = max(-30, min(30, weights[0] + sum(weights[i + 1] * normalized[i] for i in range(len(means)))))
            error = 1 / (1 + math.exp(-z)) - label
            gradient[0] += error * sample_weight
            for i, value in enumerate(normalized):
                gradient[i + 1] += error * value * sample_weight
        for i in range(len(weights)):
            weights[i] -= rate * (gradient[i] / weight_total + (0 if i == 0 else penalty * weights[i]))
    return weights


def main():
    rows = load_rows()
    if len(rows) < 100:
        raise SystemExit(f"Only {len(rows)} MCFW labeled windows found. Run download_mcfw_subset.mjs first.")
    train_people = MCFW_TRAIN_PEOPLE
    mcfw_train = [row for row in rows if row[2] in train_people]
    mcfw_held = [row for row in rows if row[2] not in train_people]
    gazetype_train, gazetype_held, gazetype_train_people, gazetype_held_people = load_gazetype_rows()
    if len(gazetype_train) < 100 or not gazetype_held:
        raise SystemExit("GazeTypeBD subset is missing. Run download_gazetypebd_subset.mjs first.")

    training_rows = mcfw_train + gazetype_train
    train_x = [row[0] for row in training_rows]
    # Weight the Tobii benchmark more heavily while adapting to webcam patterns.
    sample_weights = [1.0] * len(mcfw_train) + [0.025] * len(gazetype_train)
    weight_total = sum(sample_weights)
    means = [sum(row[i] * weight for row, weight in zip(train_x, sample_weights)) / weight_total for i in range(len(train_x[0]))]
    scales = [max(math.sqrt(sum(weight * (row[i] - means[i]) ** 2 for row, weight in zip(train_x, sample_weights)) / weight_total), 1e-6) for i in range(len(means))]
    weights = train_logistic(train_x, [row[1] for row in training_rows], means, scales, sample_weights)

    def probability(row, active_weights=weights):
        z = active_weights[0] + sum(active_weights[i + 1] * ((row[i] - means[i]) / scales[i]) for i in range(len(means)))
        return 1 / (1 + math.exp(-max(-30, min(30, z))))

    # Original five-feature MCFW-only artifact, frozen for a fair side-by-side
    # comparison even after this trainer overwrites the checked-in model.
    baseline = {
        "means": [0.05228776226452832, 0.08624536845107096, 1.5453207199233003, 0.5052493461168502, 0.4272170712030785],
        "scales": [0.05160685369356385, 0.07005336325930206, 0.8860680465042856, 0.09363594848824994, 0.1290280109254453],
        "weights": [0.4646856603754264, -0.8470440087838984, 0.6224498512042438, -0.35608934613178583, 1.18097035463785, 0.378474451914956],
    }
    def old_probability(row):
        z = baseline["weights"][0] + sum(baseline["weights"][i + 1] * ((row[i] - baseline["means"][i]) / baseline["scales"][i]) for i in range(len(row)))
        return 1 / (1 + math.exp(-max(-30, min(30, z))))

    tp = tn = fp = fn = 0
    for row, label, _ in mcfw_held:
        predicted = probability(row) >= 0.5
        if predicted and label: tp += 1
        elif predicted: fp += 1
        elif label: fn += 1
        else: tn += 1
    balanced = ((tp / max(1, tp + fn)) + (tn / max(1, tn + fp))) / 2
    old_tp = old_tn = old_fp = old_fn = 0
    for row, label, _ in mcfw_held:
        predicted = old_probability(row) >= 0.5
        if predicted and label: old_tp += 1
        elif predicted: old_fp += 1
        elif label: old_fn += 1
        else: old_tn += 1
    old_balanced = ((old_tp / max(1, old_tp + old_fn)) + (old_tn / max(1, old_tn + old_fp))) / 2
    old_delay_rate = sum(old_probability(row) < 0.35 for row, _, _ in gazetype_held) / len(gazetype_held)
    old_delay_rate_020 = sum(old_probability(row) < 0.20 for row, _, _ in gazetype_held) / len(gazetype_held)
    new_delay_rate = sum(probability(row) < 0.35 for row, _, _ in gazetype_held) / len(gazetype_held)
    new_delay_rate_020 = sum(probability(row) < 0.20 for row, _, _ in gazetype_held) / len(gazetype_held)
    mcfw_structured_delay_rate_020 = sum(probability(row) < 0.20 for row, label, _ in mcfw_held if label == 1) / max(1, sum(label == 1 for _, label, _ in mcfw_held))

    model = {
        "model_type": "standardized_logistic_regression", "model_version": 2,
        "features": ["std_x", "std_y", "path_speed", "mean_x", "mean_y"],
        "means": means, "scales": scales, "weights": weights,
        "classes": {"0": "natural_image_viewing", "1": "structured_gaze_task"}, "threshold": 0.5,
        "provenance": "MCFW-Gaze (Zenodo DOI 10.5281/zenodo.18725479; CC BY 4.0) and GazeTypeBD (Mendeley DOI 10.17632/4m2pm5hp9j.1; CC BY 4.0). GazeTypeBD windows are sampled by participant and split participant-disjoint.",
        "evaluation": {"mcfw_train_participants": sorted(train_people), "mcfw_held_out_participants": sorted({row[2] for row in mcfw_held}),
                       "gazetype_train_participants": gazetype_train_people, "gazetype_held_out_participants": gazetype_held_people,
                       "mcfw_windows_train": len(mcfw_train), "gazetype_windows_train": len(gazetype_train),
                       "mcfw_windows_held_out": len(mcfw_held), "gazetype_windows_held_out": len(gazetype_held),
                       "mcfw_held_out_balanced_accuracy": balanced, "mcfw_previous_model_balanced_accuracy_same_holdout": old_balanced,
                       "mcfw_confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
                       "gazetype_previous_model_extra_delay_rate_below_0_35": old_delay_rate,
                       "gazetype_previous_model_extra_delay_rate_below_0_20": old_delay_rate_020,
                       "gazetype_updated_model_extra_delay_rate_below_0_35": new_delay_rate,
                       "gazetype_updated_model_extra_delay_rate_below_0_20": new_delay_rate_020,
                       "mcfw_held_out_structured_below_0_20_rate": mcfw_structured_delay_rate_020},
        "limitations": "GazeTypeBD contributes task-focused webcam typing examples but no ReVoice button-choice labels. Lower extra-delay rate on held-out typing windows suggests fewer slowdowns for this dataset; it does not establish ReVoice selection accuracy, intent recognition, or performance for AAC users. MCFW test set is small and Tobii-based."
    }
    MODEL_OUT.write_text(json.dumps(model, indent=2), encoding="utf-8")
    print(f"Training windows: {len(training_rows)} total ({len(mcfw_train)} MCFW + {len(gazetype_train)} GazeTypeBD)")
    print(f"MCFW held-out balanced accuracy: {balanced:.3f} (previous model on same holdout: {old_balanced:.3f}; n={len(mcfw_held)})")
    print(f"GazeTypeBD held-out extra-dwell rate: previous model {old_delay_rate_020:.1%} at <0.20 and {old_delay_rate:.1%} at <0.35; updated: {new_delay_rate_020:.1%} at <0.20 and {new_delay_rate:.1%} at <0.35 (n={len(gazetype_held)})")
    print(f"MCFW held-out structured windows below 0.20: {mcfw_structured_delay_rate_020:.1%}")
    print(f"Model written to {MODEL_OUT}")

if __name__ == "__main__":
    main()




















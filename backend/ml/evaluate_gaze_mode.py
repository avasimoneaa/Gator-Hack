"""Nested participant-disjoint feature comparison for the MCFW-Gaze subset.

Requires NumPy (install with: python -m pip install -r backend/ml/requirements-eval.txt).
"""
import numpy as np

import train_gaze_mode as training

CANDIDATES = {"baseline_3_features": (0, 1, 2), "position_5_features": (0, 1, 2, 3, 4)}
ITERATIONS = 700


def fit_predict(train_rows, test_rows, indexes):
    x = np.asarray([[row[0][i] for i in indexes] for row in train_rows], dtype=float)
    y = np.asarray([row[1] for row in train_rows], dtype=float)
    mean = x.mean(axis=0)
    scale = np.maximum(x.std(axis=0), 1e-6)
    design = np.column_stack([np.ones(len(x)), (x - mean) / scale])
    weights = np.zeros(design.shape[1])
    for _ in range(ITERATIONS):
        probability = 1 / (1 + np.exp(-np.clip(design @ weights, -30, 30)))
        gradient = design.T @ (probability - y) / len(y)
        gradient[1:] += 0.015 * weights[1:]
        weights -= 0.08 * gradient
    test_x = np.asarray([[row[0][i] for i in indexes] for row in test_rows], dtype=float)
    test_design = np.column_stack([np.ones(len(test_x)), (test_x - mean) / scale])
    return (test_design @ weights >= 0).astype(int).tolist()


def balanced_accuracy(actual, predicted):
    tp = sum(a == 1 and p == 1 for a, p in zip(actual, predicted))
    tn = sum(a == 0 and p == 0 for a, p in zip(actual, predicted))
    fp = sum(a == 0 and p == 1 for a, p in zip(actual, predicted))
    fn = sum(a == 1 and p == 0 for a, p in zip(actual, predicted))
    return ((tp / max(1, tp + fn)) + (tn / max(1, tn + fp))) / 2, (tp, tn, fp, fn)


def main():
    rows = training.load_rows()
    participants = sorted({person for _, _, person in rows})
    actual_nested, predicted_nested = [], []
    actual_baseline, predicted_baseline = [], []
    chosen_counts = {name: 0 for name in CANDIDATES}

    for held_person in participants:
        outer_train = [row for row in rows if row[2] != held_person]
        outer_test = [row for row in rows if row[2] == held_person]
        inner_people = sorted({row[2] for row in outer_train})
        candidate_scores = {}
        for name, indexes in CANDIDATES.items():
            actual, predicted = [], []
            for validation_person in inner_people:
                inner_train = [row for row in outer_train if row[2] != validation_person]
                inner_test = [row for row in outer_train if row[2] == validation_person]
                predicted.extend(fit_predict(inner_train, inner_test, indexes))
                actual.extend(row[1] for row in inner_test)
            candidate_scores[name] = balanced_accuracy(actual, predicted)[0]

        selected = max(CANDIDATES, key=lambda name: candidate_scores[name])
        chosen_counts[selected] += 1
        predicted_nested.extend(fit_predict(outer_train, outer_test, CANDIDATES[selected]))
        actual_nested.extend(row[1] for row in outer_test)
        predicted_baseline.extend(fit_predict(outer_train, outer_test, CANDIDATES["baseline_3_features"]))
        actual_baseline.extend(row[1] for row in outer_test)
        print(f"Finished held-out participant {held_person}", flush=True)

    nested, nested_counts = balanced_accuracy(actual_nested, predicted_nested)
    baseline, baseline_counts = balanced_accuracy(actual_baseline, predicted_baseline)
    print(f"Nested LOPO feature-selection balanced accuracy: {nested:.3f}; TP/TN/FP/FN: {nested_counts}")
    print(f"Three-feature LOPO baseline balanced accuracy: {baseline:.3f}; TP/TN/FP/FN: {baseline_counts}")
    print(f"Selected feature sets by outer fold: {chosen_counts}")


if __name__ == "__main__":
    main()

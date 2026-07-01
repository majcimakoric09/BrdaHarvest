# models/

Trained/serialized ML model artifacts (e.g. `.pkl`, `.joblib`) produced by
`analysis/` and loaded by `backend/app/services/` at inference time.

```
models/
└── artifacts/   # Serialized model files (git-ignored — see .gitignore)
```

## Notes

- Model binaries are excluded from git by default (`.gitignore`) since
  they're regenerable from `analysis/` and can be large.
- If a specific trained model needs to be version-controlled for
  reproducibility, use Git LFS or a release asset rather than committing
  it directly.

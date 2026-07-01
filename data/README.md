# data/

Vineyard dataset (~2,176 records: weather, grape variety, vineyard
characteristics, harvest timing, and yield) and any derived versions of it.

```
data/
├── raw/         # Original, unmodified approved dataset — treat as read-only
├── processed/   # Cleaned/feature-engineered data produced by analysis/
└── external/    # Any supplementary third-party data (e.g. extra weather data)
```

## Notes

- Files in `raw/` should never be edited in place — transformations belong
  in `analysis/src/` and should write to `processed/`.
- Whether raw/processed data is committed to git or kept local depends on
  file size and any data-sharing restrictions on the approved dataset —
  revisit `.gitignore` if that changes.

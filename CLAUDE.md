# Project Guidelines

## Documentation

All project documentation is in `note/`. Start with `note/readme.md` for
an index of all docs. Key files:

| Topic              | Location                     |
| ------------------ | ---------------------------- |
| Doc index          | `note/readme.md`             |
| Project vision     | `note/vision.md`             |
| Implementation     | `note/plan.md`               |
| Package structure  | `note/package-structure.md`  |
| Math theory        | `note/theory.md`             |
| Optimization       | `note/optimization.md`       |

## Security rules

- Do not read or include any secrets files.
- Avoid scanning hidden files or non-template configuration files.

## Conventions

- Use pnpm, NOT npm or yarn.
- Use prettier and eslint.
- Use dotenv.

## Other important notes

- Never make it necessary to have to avoid using `export default ...`,
  that should always be accetable and working, even when importing.
  PLEASE MAKE SURE THAT IS POSSIBLE.
- All readmes should have a LOWERCASE file name, exactly as `readme.md`,
  not `README.md`.

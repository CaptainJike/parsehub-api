# Architecture Rules

- Use modular monolith boundaries.
- Route handlers validate and delegate.
- Services own business decisions.
- Provider classes own external parse calls.
- Shared infrastructure belongs under `src/shared`.
- Do not add business code to the sibling `btch-downloader` repository.
- Prefer simple modules over premature microservices.

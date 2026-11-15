# Project rules

- Store Clinical Review relationships explicitly on each case with destination IDs and displayed case numbers; do not infer relationships from member names.
- Reuse FaxStepFlow for the New Intake form's member, drug, priority, and history sections so both experiences stay identical.
- Keep New Intake in the existing IntakePage case/state collections with an explicit manual-intake marker and optional FaxStepFlow additions, so shared fax behavior stays unchanged.
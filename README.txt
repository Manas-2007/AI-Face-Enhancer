RGFormer UI + runtime fix
=========================

PART A — COMPACT REFERENCE DROPDOWN
This update moves the RGFormer reference-image picker into a compact expandable
row. Clicking Generate without a reference opens the row and explains what is
needed. After selecting a reference, the row collapses and shows its filename.

PART B — FIX THE ERROR FROM THE BACKEND LOG
The log showed `ModuleNotFoundError: No module named 'basicsr'`. RGFormer also
uses CodeFormer's registered architecture, so this package includes a script
that installs the existing CodeFormer BasicSR source into `.venv-rgformer` and
ensures that RGFormer imports/registers the CodeFormer architecture before use.

APPLY
1. Stop the backend and frontend dev servers with Ctrl+C in their terminals.
2. Extract this ZIP into the project root:
   C:\Users\MANAS PATIDAR\Desktop\Deep Learning Project
3. Allow `src/Components/AI_Label.jsx` to be overwritten. The script is added at
'the root' as `Enable_RGFormer_Runtime.ps1`.
4. In a PowerShell opened at the project root, run:
   powershell -ExecutionPolicy Bypass -File .\Enable_RGFormer_Runtime.ps1
5. If the script finishes with `BasicSR and CodeFormer architecture imports OK`,
   restart backend and frontend, then try RGFormer once more.
6. If the script shows an error, do not push yet; copy the full error from the
   terminal so the remaining dependency issue can be fixed.

The script changes only the RGFormer Python environment and adds one import to
`backend\RGFormer\infer.py`. It does not replace model weights or the repository.
The inference itself still must be tested on the local GPU before committing/pushing.

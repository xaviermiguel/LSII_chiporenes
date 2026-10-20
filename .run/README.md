# Local backend configuration

Run `ProtubeBackApplication` from IntelliJ. Its shared configuration uses the
`prod` profile, validates the existing schema and loads
`.run/protube-local.properties` from the project root.

The private file is ignored by Git. Your current values have been preserved
there; commits and branch changes do not replace it. Do not add passwords back
to the shared run XML. To edit local connection values, edit the private file.
Environment variables explicitly set in IntelliJ or Windows take precedence
over matching values in this file.

For a new checkout, copy `protube-local.properties.example` to
`protube-local.properties` and enter your own database credentials and store
directory. Use forward slashes in Windows paths, as in the example. The current
private file uses Java properties Unicode escapes to preserve values exactly;
those escapes are encoding, not encryption.

Keep `ENV_PROTUBE_IMPORT_ENABLED=false` for normal startup. For a deliberate
import, temporarily add `--pro_tube.import.enabled=true` to Program arguments,
wait for `Video import committed`, then remove that argument.

The backend configuration does not start Vite. Run the frontend separately.

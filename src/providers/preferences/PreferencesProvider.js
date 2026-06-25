// PreferencesProvider — contract for storing small client UI preferences
// (view modes, saved filters, dismissed notifications). Keeps UI state behind an
// abstraction — preferences come from the configured provider.
export default class PreferencesProvider {
  // eslint-disable-next-line no-unused-vars
  get(key, fallback = null) { return fallback; }
  // eslint-disable-next-line no-unused-vars
  set(key, value) { return false; }
  // eslint-disable-next-line no-unused-vars
  remove(key) { return false; }
}

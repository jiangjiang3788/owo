# V21: TTS / voice / CoT settings split

## Goal

Move only settings UI and preset entry ownership for TTS, voice presets, and character CoT settings into `features/settings/voiceCot`.

## In scope

- TTS preset select/save/apply/manage/import/export UI.
- Voice preset select/save/apply/manage UI.
- Single-character CoT settings load/save helpers inside chat settings.
- CoT settings page init entry facade.

## Out of scope

- `chat_ai.js`.
- Provider fetch and stream parsing.
- Prompt builder semantics.
- TTS synthesis/playback services.
- Full CoT editor implementation in `js/modules/cot_settings.js`.

## Ownership

| File | Responsibility |
|---|---|
| `voiceCotRuntime.js` | Runtime bridge for save/toast/file/presetEngine |
| `ttsPresetView.js` | TTS preset UI and preset operations |
| `voicePresetView.js` | Voice preset UI and preset operations |
| `cotCharacterSettingsView.js` | Character CoT settings load/save helpers |
| `cotSettingsEntry.js` | CoT init entry shell for legacy implementation |
| `public.js` | Stable facade only |

## Gate

- `settings.js` may only keep compatibility wrappers for migrated functions.
- New `voiceCot` files must not call legacy `window.saveData` or `window.showToast`.
- `voiceCot` scripts must load before `settings.js`.
- `voiceCot/public.js` must load before `js/modules/cot_settings.js` so the legacy CoT implementation can register itself.

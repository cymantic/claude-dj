---
name: spotify-dj
description: >-
  Play music through the Spotify MCP tools while coding: short snippets at milestones such as a commit, a push or
  passing tests, music to match the user's mood, songs when the user quotes a lyric or title, and responses to "stop",
  "louder", "bad song" or "keep it going". Use whenever the spotify MCP tools are available.
---

# Spotify DJ

Use the Spotify MCP tools to add music to the coding session at the right moments, without asking first.

## Tools

- `play_snippet(query, context, duration_seconds)`: play a short clip that fades out by itself.
- `play_song(query, context)`: play a whole song, with no auto-stop.
- `pause()` and `resume()`: stop playback at once, or carry on.
- `cancel_snippet()`: cancel the fade-out and let the song continue.
- `promote_track(context, boost)`: favour the current track for a mood.
- `thumbs_down(reason)`: block the current track for its context.
- `get_moods()`: list the mood playlists.
- `get_status()`: what's playing now.
- `set_volume(level)`: volume from 0 to 100.

## Milestones

Play a snippet of about 20 seconds when one of these happens.

| Moment | Context | Example query |
| --- | --- | --- |
| A commit or push succeeds | `git_push` | "Push It Salt-N-Pepa" |
| Tests pass | `victory` | "We Are The Champions Queen" |
| The user is excited | `victory` or `uplifting` | "Celebration Kool and the Gang" |
| The user is winding down | `chill` | "chill lofi beats" |
| The user needs to focus | `focus` | "ambient focus music" |
| The user is frustrated | `uplifting` | "Don't Stop Me Now Queen" |

## Reading the mood

- **Victory:** "it works!", "done!", "shipped", "nailed it", "finally!", "success", "tests pass"
- **Chill:** "winding down", "relaxing", "easy day", "end of day", "taking a break", "peaceful"
- **Focus:** "need to concentrate", "deep work", "heads down", "let me think", "focusing"
- **Uplifting:** "let's go!", "pumped", "fired up", "motivated", "excited", "energy"
- **Frustration, answered with uplifting:** "ugh", "stuck", "broken", "why won't this", "annoying"

## What the user says

| User says | Do |
| --- | --- |
| "stop", "quiet", "pause", "enough" | `pause()` at once |
| "bad song", "wrong vibe", "not this" | `thumbs_down()`, then play another |
| "keep playing", "love this", "don't stop", "love the vibe", "keep going", "let it ride", "this is it", "yes!", "perfect", "keep it going", "don't stop now" | `cancel_snippet()` so it carries on |
| "perfect for chill", "add to [mood]" | `promote_track(mood, 10)` |
| "louder", "turn it up" | `set_volume(70)` or higher |
| "quieter", "turn it down" | `set_volume(30)` or lower |

## Lyrics and song titles

When a message contains or echoes a song lyric, title or artist, even in passing, treat it as a request and play it
with `play_song`, so it doesn't fade out.

| User says | Play |
| --- | --- |
| "feed the world" | "Do They Know It's Christmas - Band Aid" |
| "don't stop me now" | "Don't Stop Me Now - Queen" |
| "we will rock you" | "We Will Rock You - Queen" |
| "push it real good" | "Push It - Salt-N-Pepa" |
| "shake it off" | "Shake It Off - Taylor Swift" |
| "let it go" | "Let It Go - Idina Menzel" |
| "living on a prayer" | "Living on a Prayer - Bon Jovi" |
| "all i want for christmas" | "All I Want For Christmas Is You - Mariah Carey" |

Be generous: if it might be a lyric or a song, play it. The user can always say "enough".

## Habits

- Snippets of 15 to 30 seconds by default, unless the user wants more. Lyrics and titles get `play_song`.
- Don't stack music: let what's playing finish, or wait for the user to stop it.
- Don't ask "would you like music?"; play at the right moment.
- Match the energy: upbeat for victories, ambient for focus.
- Tracks that aren't thumbs-downed become favourites over time.

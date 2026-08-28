export function buildH3EditPrompt(input: { speaker: string; dialogue: string; duration: number }) {
  return `subject_definitions:
<Video 1> is the source video for the target video edit, including its visible people, setting, composition, camera movement, and timing.
<Subject 1> is ${input.speaker} in <Video 1>, preserving the person's identity, appearance, clothing, position, expression, and body movement.
<Audio 1> is the synchronized soundtrack of <Video 1>; its ambience and non-dialogue sounds are reused, while the speaking voice's timbre and delivery guide (S1).

summary:
[video editing + audio reference] The target video is an edited version of <Video 1>. It preserves the source scene and timing while <Subject 1> speaks replacement dialogue with synchronized lip movement.

retention_analysis:
<Video 1> (complete visual timeline): fully_preserved - preserve the framing, camera movement, cuts, lighting, environment, all non-speaking people, and action timing.
<Subject 1> (appears throughout the source segment): partially_preserved - preserve identity, pose, expression, and movement while changing only mouth articulation to match the replacement dialogue.
<Audio 1>: partially_copy - retain ambience and physical sounds while replacing the selected speaker's words and referencing the original voice timbre and delivery.

detailed_description:
The target video is live-action and exactly follows <Video 1>'s visual style, composition, camera motion, action, and ${input.duration.toFixed(2)}-second timing.
[Shot 1] Preserve the source segment continuously. <Subject 1> (S1) remains in the original position and performs the same visible actions and expressions. The speaker says naturally in the voice timbre, cadence, volume, and acoustic space referenced from <Audio 1>: <d>[English] ${input.dialogue}</d> Precisely synchronize every visible mouth movement with the replacement words. Preserve every other person's closed-mouth state or original non-speaking reaction. Do not add subtitles, captions, graphics, new objects, new people, or camera changes.

overall_soundscape:
Reuse the room tone, ambience, and physical sound layers referenced from <Audio 1>, excluding the original selected dialogue.

non_diegetic_music:
Reuse any audience-only score from <Audio 1> without alteration; otherwise N/A.`;
}

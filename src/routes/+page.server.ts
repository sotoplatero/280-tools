import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

if (!env.OPENAI_API_KEY) {
	throw new Error('OPENAI_API_KEY is required');
}

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
});

export const actions: Actions = {
	generateTweet: async ({ request }) => {
		try {
			const formData = await request.formData();
			const audioFile = formData.get('audio') as File;

			if (!audioFile || audioFile.size === 0) {
				return fail(400, { error: 'No audio file provided' });
			}

			// Step 1: Transcribe audio using Whisper
			console.log('Transcribing audio...');
			const transcription = await openai.audio.transcriptions.create({
				file: audioFile,
				model: 'whisper-1',
				response_format: 'text'
			});

			console.log('Transcription:', transcription);

			// Validate transcription content
			const transcriptText = transcription.toString().trim();
			if (!transcriptText || transcriptText.length < 5) {
				return fail(400, {
					error: 'No speech detected in the recording. Please speak clearly and try again.',
					transcription: transcriptText || 'No speech detected'
				});
			}

			// Check for meaningful content (not just noise or filler words)
			const meaningfulWords = transcriptText.toLowerCase()
				.replace(/[.,!?;]/g, '')
				.split(/\s+/)
				.filter(word =>
					word.length > 2 &&
					!['um', 'uh', 'hmm', 'err', 'the', 'and', 'but', 'for'].includes(word)
				);

			if (meaningfulWords.length < 2) {
				return fail(400, {
					error: 'Recording seems to contain only noise or filler words. Please speak more clearly.',
					transcription: transcriptText
				});
			}

			// Step 2: Generate tweet using GPT-4
			console.log('Generating tweet...');
			const completion = await openai.chat.completions.create({
				model: 'gpt-4.1-nano',
				messages: [
					{
						role: 'system',
						content: `You are a professional X (Twitter) copywriter.

GOAL
Turn the user's short voice transcription into a clear, high-impact tweet.

OUTPUT
- Return ONLY the tweet text (plain text). No preamble, no quotes, no code fences.
- Max 280 characters.
- No hashtags, no emojis.
- Do not add @mentions or links unless they appear in the input.

LANGUAGE
- Detect the input language and write the tweet in that same language.
- Do not translate unless the user explicitly asks.

MEANING & TONE
- Preserve the original meaning, tone, and intent. Do not invent, reinterpret, or add claims.
- If it’s a question, keep it a question.
- If it’s a list or facts, keep it as a clean list.
- If it’s an opinion, keep it direct and confident without adding meaning.

STYLE (Modern X)
- One idea only; if multiple ideas, keep the most important one.
- Sharp first line; strong verbs; concrete specifics when present (numbers, names).
- Short sentences. Smart line breaks. White space for readability.
- Bulleted/numbered list when appropriate.

EDITING
- Remove filler/transcription noise (“uh”, “um”, repeated words).
- Fix obvious dictation, punctuation, and casing errors without rewriting ideas.
- You may reorder clauses/lines for clarity and punch without changing meaning.
- Keep proper nouns and numbers accurate.

TRIMMING (if >280 chars, apply in order)
1) Cut filler/hedges and redundant words.
2) Drop non-essential qualifiers and side notes.
3) Split long sentences; compress list items.
4) Preserve core facts, names, numbers, and tone.

FORMAT RULES
- For lists: use “1.”, “2.”, “3.” or dashes “–”.
- Allow a single blank line between lines for readability.
- No titles, explanations, or metadata—only the tweet text.

PROCESS
1) Extract the single main idea.
2) Choose the best format (statement, question, or list).
3) Edit for clarity and punch per the rules above.
4) Enforce length and style constraints.
5) Output the tweet text only.

`
					},
					{
						role: 'user',
						content: `Transcription: "${transcription}"`
					}
				],
				max_tokens: 100,

				temperature: 0.7
			});

			const tweet = completion.choices[0]?.message?.content || 'Failed to generate tweet';

			console.log('Generated tweet:', tweet);

			return {
				success: true,
				transcription: transcriptText,
				tweet: tweet,
				characterCount: tweet.length
			};

		} catch (error) {
			console.error('Error processing audio:', error);

			if (error instanceof Error) {
				return fail(500, { error: `Processing failed: ${error.message}` });
			}

			return fail(500, { error: 'Unknown error occurred' });
		}
	}
};
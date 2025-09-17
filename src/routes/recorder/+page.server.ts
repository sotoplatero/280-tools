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
						content: `You are a professional tweet writer.

Your task is to convert a short voice transcription into a clear, engaging tweet — in the **same language as the input**, unless the user explicitly requests otherwise.

Guidelines:
- Max 280 characters
- No hashtags
- No emojis
- Do NOT invent or reinterpret the content
- Stay true to the tone and intent of the input
- If it’s a list or fact, format it cleanly
- If it’s a question, keep it as a question
- If it’s an opinion, make it bold — but don’t add meaning

Style:
- Use modern X formatting:
  - Short sentences
  - Smart line breaks
  - Bullet or list format when appropriate
  - White space to improve readability
- Make it feel spoken, natural, and confident
- No title, no explanation — only return the tweet text

Language:
- Detect the input language and respond in that same language.
- Do not translate unless asked.

Example input →  
"los tres países más poblados del mundo"

Expected output →  
Los 3 países más poblados del mundo:  
1. China  
2. India  
3. Estados Unidos`
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
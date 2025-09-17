<script lang="ts">
	import { Mic, Square, Copy, ExternalLink, CircleAlert } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import TweetDisplay from '$lib/components/TweetDisplay.svelte';

	// Props - now optional since component is self-contained
	let {
		onRecordingComplete
	}: {
		onRecordingComplete?: (audioBlob: Blob) => void;
	} = $props();

	// Recording State
	let isRecording = $state(false);
	let mediaRecorder: MediaRecorder | null = $state(null);
	let audioChunks: Blob[] = $state([]);
	let recordingTime = $state(0);
	let recordingInterval: ReturnType<typeof setInterval> | null = null;
	let audioContext: AudioContext | null = $state(null);
	let analyser: AnalyserNode | null = $state(null);
	let hasDetectedSound = $state(false);

	// Processing and Results State
	let isProcessing = $state(false);
	let audioBlob: Blob | null = $state(null);
	let formElement: HTMLFormElement | null = $state(null);
	let error: string | null = $state(null);
	let tweet: string | null = $state(null);
	let transcription: string | null = $state(null);
	let characterCount: number = $state(0);
	let copied = $state(false);

	const MAX_DURATION = 15; // 15 seconds

	async function toggleRecording() {
		if (isRecording) {
			stopRecording();
		} else {
			await startRecording();
		}
	}

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true }
			});

			// Setup audio analysis for sound detection
			audioContext = new AudioContext();
			analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.fftSize = 256;

			mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const blob = new Blob(audioChunks, { type: 'audio/webm' });
				stream.getTracks().forEach(track => track.stop());

				// Close audio context
				if (audioContext) {
					audioContext.close();
					audioContext = null;
				}

				// Store audio blob and process tweet generation
				audioBlob = blob;
				await handleRecordingComplete(blob);

				// Also call parent callback if provided
				onRecordingComplete?.(blob);
			};

			audioChunks = [];
			hasDetectedSound = false;
			mediaRecorder.start();
			isRecording = true;
			recordingTime = 0;

			// Start monitoring audio levels
			monitorAudioLevel();

			recordingInterval = setInterval(() => {
				recordingTime++;
				if (recordingTime >= MAX_DURATION) stopRecording();
			}, 1000);

		} catch (error) {
			console.error('Microphone error:', error);
		}
	}

	function monitorAudioLevel() {
		if (!analyser || !isRecording) return;

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		analyser.getByteFrequencyData(dataArray);

		// Calculate average volume
		const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

		// If we detect sound above threshold, mark as detected
		if (average > 20 && !hasDetectedSound) {
			hasDetectedSound = true;
		}

		// Continue monitoring if still recording
		if (isRecording) {
			requestAnimationFrame(monitorAudioLevel);
		}
	}

	function stopRecording() {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			isRecording = false;
			if (recordingInterval) {
				clearInterval(recordingInterval);
				recordingInterval = null;
			}
		}
	}

	function formatCountdown(seconds: number): string {
		const remaining = MAX_DURATION - seconds;
		return remaining.toString().padStart(2, '0');
	}

	async function handleRecordingComplete(blob: Blob) {
		// Reset previous results
		error = null;
		tweet = null;
		transcription = null;
		characterCount = 0;

		// Create and submit form data directly
		if (formElement) {
			// Create file input and set the blob
			const fileInput = formElement.querySelector('input[name="audio"]') as HTMLInputElement;
			if (fileInput) {
				const audioFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(audioFile);
				fileInput.files = dataTransfer.files;

				// Submit form
				formElement.requestSubmit();
			}
		}
	}

	function handleFormResult(result: any) {
		isProcessing = false;

		if (result.type === 'success' && result.data) {
			if (result.data.success && result.data.tweet) {
				tweet = result.data.tweet;
				transcription = result.data.transcription || null;
				characterCount = result.data.characterCount || 0;
				error = null;
			} else if (result.data.error) {
				error = result.data.error;
				tweet = null;
				transcription = null;
				characterCount = 0;
			}
		} else if (result.type === 'failure') {
			error = 'Failed to process audio. Please try again.';
			tweet = null;
			transcription = null;
			characterCount = 0;
		}
	}

	async function copyToClipboard() {
		if (!tweet) return;

		try {
			await navigator.clipboard.writeText(tweet);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	}

	function openTwitterIntent() {
		if (!tweet) return;

		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
		window.open(url, '_blank');
	}

	function resetResults() {
		tweet = null;
		transcription = null;
		characterCount = 0;
		error = null;
		audioBlob = null;
		copied = false;
	}
</script>

<div class="w-full">
	{#if isRecording}
		<!-- Recording Mode - Full Screen with fade in effect -->
		<div class="fixed inset-0 bg-base-content flex items-center justify-center z-50 animate-in fade-in duration-500">
			<div class="text-center">
				<div class="text-9xl font-mono mb-4 font-bold text-base-100">{formatCountdown(recordingTime)}</div>
				<div class="text-xl mb-6 text-base-100">seconds remaining</div>

				<!-- Sound detection indicator -->
				<div class="mb-8">
					{#if hasDetectedSound}
						<div class="flex items-center justify-center gap-2 text-green-300">
							<div class="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
							<span class="text-sm">Sound detected</span>
						</div>
					{:else}
						<div class="flex items-center justify-center gap-2 text-yellow-300">
							<div class="w-3 h-3 bg-yellow-300 rounded-full"></div>
							<span class="text-sm">Speak now...</span>
						</div>
					{/if}
				</div>

				<!-- Stop Button positioned at bottom center -->
				<div class="fixed bottom-20 left-1/2 transform -translate-x-1/2">
					<button onclick={toggleRecording} class="btn btn-circle btn-xl btn-error relative">
						<Square class="w-10 h-10" />
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main Interface - Relative positioning for buttons within hero -->
		<div class="relative">
			<!-- Processing indicator -->
			{#if isProcessing}
				<div class="text-center mb-8">
					<div class="loading loading-spinner loading-md text-primary"></div>
					<p class="text-sm text-gray-500 mt-2">Processing audio...</p>
				</div>
			{/if}

			<!-- Record Button positioned at bottom of hero section -->
			<div class="text-center">
				<button onclick={toggleRecording} class="btn btn-circle btn-xl btn-primary record-button">
					<Mic class="w-6 h-6 relative z-10" />
				</button>
			</div>
		</div>

		<!-- Hidden form for processing -->
		<form
			bind:this={formElement}
			method="POST"
			action="/recorder?/generateTweet"
			enctype="multipart/form-data"
			use:enhance={() => {
				isProcessing = true;
				return async ({ result, update }) => {
					handleFormResult(result);
					await update();
				};
			}}
			class="hidden"
		>
			<input type="file" name="audio" accept="audio/*" required />
		</form>

		<!-- Results Section -->
		{#if tweet}
			<TweetDisplay {tweet} transcription={transcription || undefined} {characterCount} />
		{/if}

		<!-- Error Messages -->
		{#if error}
			<div role="alert" class="alert alert-error alert-soft mt-6">
				<CircleAlert class="w-6 h-6 text-red-500 mr-2" />
				<span>{error}</span>
				<button
					class="btn btn-xs btn-ghost ml-auto"
					onclick={() => error = null}
				>
					Dismiss
				</button>
			</div>
		{/if}
	{/if}
</div>
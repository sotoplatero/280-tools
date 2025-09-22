<script lang="ts">
	import { Mic, Square, CircleAlert } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	// Props
	let {
		onRecordingComplete,
		onProcessingStart,
		onProcessingComplete,
		onError
	}: {
		onRecordingComplete?: (audioBlob: Blob) => void;
		onProcessingStart?: () => void;
		onProcessingComplete?: (result: { tweet: string; transcription?: string; characterCount: number }) => void;
		onError?: (error: string) => void;
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

	// Processing State
	let isProcessing = $state(false);
	let audioBlob: Blob | null = $state(null);
	let formElement: HTMLFormElement | null = $state(null);

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
			// Clear previous results when starting new recording
			onProcessingComplete?.({ tweet: '', transcription: undefined, characterCount: 0 });

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

				// Call parent callback if provided
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
			onError?.('Microphone access denied. Please allow microphone permission and try again.');
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
				const processedResult = {
					tweet: result.data.tweet,
					transcription: result.data.transcription || undefined,
					characterCount: result.data.characterCount || 0
				};
				onProcessingComplete?.(processedResult);
			} else if (result.data.error) {
				onError?.(result.data.error);
			}
		} else if (result.type === 'failure') {
			onError?.('Failed to process audio. Please try again.');
		}
	}
</script>

<div class="w-full ">
	{#if isRecording}
		<!-- Recording Mode - Full Screen with fade in effect -->
		<div class="fixed inset-0 flex items-center justify-center z-50 animate-in fade-in duration-500 bg-base-100">
			<div class="text-center">
				<div class="text-9xl font-mono mb-4 font-bold ">{formatCountdown(recordingTime)}</div>

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
				<div class="">
					<button onclick={toggleRecording} class="btn btn-circle btn-xl btn-error relative">
						<Square class="fill-current" />
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main Interface - Relative positioning for buttons within hero -->
		<div class=" mb-8">
			<!-- Processing indicator -->
			{#if isProcessing}
				<div class="text-center mb-8">
					<div class="loading loading-spinner loading-md text-primary"></div>
					<p class="text-sm text-gray-500 mt-2">Processing audio...</p>
				</div>
			{/if}

			<!-- Record Button positioned at bottom of hero section -->
			<div class="text-center">
				<button onclick={toggleRecording} data-umami-event="record_button" class="btn btn-circle btn-xl p-4 btn-primary animate-pulse-css hover:scale-105 transition-all duration-300 ease-out">
					<Mic class="w-6 h-6" />
				</button>
			</div>
		</div>

		<!-- Hidden form for processing -->
		<form
			bind:this={formElement}
			method="POST"
			action="/?/generateTweet"
			enctype="multipart/form-data"
			use:enhance={() => {
				isProcessing = true;
				onProcessingStart?.();
				return async ({ result, update }) => {
					handleFormResult(result);
					await update();
				};
			}}
			class="hidden"
		>
			<input type="file" name="audio" accept="audio/*" required />
		</form>
	{/if}
</div>

<script lang="ts">
	import VoiceRecord from '$lib/components/VoiceRecord.svelte';
	import TweetDisplay from '$lib/components/TweetDisplay.svelte';
	import { CircleAlert } from '@lucide/svelte';

	// State for results
	let tweet: string | null = $state(null);
	let transcription: string | undefined = $state(undefined);
	let characterCount: number = $state(0);
	let error: string | null = $state(null);

	function handleProcessingComplete(result: { tweet: string; transcription?: string; characterCount: number }) {
		// Only update if we have a valid tweet (not empty string for clearing)
		if (result.tweet) {
			tweet = result.tweet;
			transcription = result.transcription;
			characterCount = result.characterCount;
			error = null;
		} else {
			// Clear results when empty tweet is passed
			tweet = null;
			transcription = undefined;
			characterCount = 0;
			error = null;
		}
	}

	function handleError(errorMessage: string) {
		error = errorMessage;
		tweet = null;
		transcription = undefined;
		characterCount = 0;
	}
</script>

<div class="min-h-dvh bg-base-100">
	<!-- Hero Section - Full screen -->
	<div class="h-dvh flex flex-col  justify-between max-w-2xl mx-auto p-8">
		<div></div> <!-- Spacer for top -->

		<div class="text-center">
			<div class="text-2xl font-semibold flex items-center justify-center mb-4"> 
				<span>rooster<span class="text-4xl text-red-500">.</span>social</span>
			</div>
			<h1 class="text-4xl font-extrabold mb-2">Tell me what’s happening</h1>
			<p class="text-base-content/80 text-xl">I write a post/tweet for you. </p>
            <!-- Results section below hero -->
            <div class="max-w-xl mx-auto w-full mt-8 ">
                <!-- Results -->
                {#if tweet}
                    <TweetDisplay {tweet} {transcription} {characterCount} />
                {/if}
    
                <!-- Error Messages -->
                {#if error}
                    <div class="alert alert-error">
                        <CircleAlert class=" mr-2" />
                        <span>{error}</span>
                    </div>
                {/if}
            </div>
		</div>


		<!-- Voice Recorder Component positioned at bottom of hero -->
		<VoiceRecord onProcessingComplete={handleProcessingComplete} onError={handleError} />
	</div>


</div>
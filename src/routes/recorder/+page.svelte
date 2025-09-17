<script lang="ts">
	import VoiceRecorder from '$lib/components/VoiceRecorder.svelte';
</script>

<div class="min-h-screen bg-base-100">
	<!-- Hero Section - Full screen -->
	<div class="h-screen flex flex-col items-center justify-between max-w-2xl mx-auto px-6 py-16">
		<div></div> <!-- Spacer for top -->

		<div class="text-center">
			<h1 class="text-4xl font-bold mb-2">Speak. Post. Done.</h1>
			<p class="text-gray-600 text-lg">Turn your voice into posts on X instantly.</p>
		</div>

		<!-- Voice Recorder Component positioned at bottom of hero -->
		<VoiceRecorder />
	</div>

	<!-- Results section below hero -->
	<div class="max-w-2xl mx-auto px-6 py-8">
		<!-- Additional content will appear here when tweet is generated -->
	<div class="mt-12 text-center text-gray-500">
		<div class="grid md:grid-cols-3 gap-6">
			<div>
				<div class="text-2xl mb-2">🎤</div>
				<h3 class="font-semibold mb-1">Record</h3>
				<p class="text-sm">Click to record your voice</p>
			</div>
			<div>
				<div class="text-2xl mb-2">🤖</div>
				<h3 class="font-semibold mb-1">Process</h3>
				<p class="text-sm">AI transcribes and writes tweet</p>
			</div>
			<div>
				<div class="text-2xl mb-2">🐦</div>
				<h3 class="font-semibold mb-1">Share</h3>
				<p class="text-sm">Copy or post directly to Twitter</p>
			</div>
		</div>
	</div>
</div>
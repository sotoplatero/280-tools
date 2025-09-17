<script lang="ts">
	import VoiceRecorder from '$lib/components/VoiceRecorder.svelte';
</script>

<div class="min-h-screen bg-base-100">
	<div class="max-w-xl mx-auto min-h-screen flex flex-col justify-center p-8">
		<h1 class="text-5xl font-bold text-center mb-2">Speak. Post. Done.</h1>
		<p class="text-base-content/70 mb-8 text-center text-xl">Turn your voice into posts on X instantly.</p>

		<!-- Voice Recorder Component with all functionality -->
		<VoiceRecorder />
	</div>

</div>
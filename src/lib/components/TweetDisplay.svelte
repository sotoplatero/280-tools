<script lang="ts">
	import { Copy, ExternalLink, Twitter } from '@lucide/svelte';

	// Props
	let {
		tweet,
		transcription,
		characterCount,
	}: {
		tweet: string;
		transcription?: string;
		characterCount: number;
	} = $props();

	let copied = $state(false);

	async function copyToClipboard() {
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
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
		window.open(url, '_blank');
	}
</script>

<div class="space-y-6">
	<!-- Generated Tweet -->
	<div class="card bg-base-200 shadow-md">
		<div class="card-body">

			<!-- Tweet Content -->
			<p class="leading-relaxed  whitespace-pre-line">{tweet}</p>

			<!-- Character Count -->
			<div class="flex justify-between items-center">
				<div class="text-sm text-gray-500">
					{characterCount}/280 characters
				</div>
			</div>

			<!-- Actions -->
			<div class="card-actions justify-end">
				<button
					class="btn btn-outline btn-sm gap-2"
					onclick={copyToClipboard}
					class:btn-success={copied}
					disabled={copied}
				>
					{#if copied}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							></path>
						</svg>
						Copied!
					{:else}
						<Copy class="w-4 h-4" />
						Copy
					{/if}
				</button>

				<button class="btn btn-primary btn-sm gap-2" onclick={openTwitterIntent}>
					<ExternalLink class="w-4 h-4" />
					Post to X
				</button>
			</div>
		</div>
	</div>


</div>
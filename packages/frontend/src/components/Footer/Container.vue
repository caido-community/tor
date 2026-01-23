<script setup lang="ts">
import { storeToRefs } from "pinia";
import Popover from "primevue/popover";
import { computed, ref } from "vue";

import StatusPopover from "./StatusPopover.vue";

import { useTorStore } from "@/stores";

const torStore = useTorStore();
const { status } = storeToRefs(torStore);

const popoverRef = ref();

const statusIcon = computed(() => {
  switch (status.value.state) {
    case "running":
      return "fas fa-circle text-green-500";
    case "starting":
    case "stopping":
      return "fas fa-circle text-yellow-500";
    case "error":
      return "fas fa-circle text-red-500";
    default:
      return "fas fa-circle text-surface-500";
  }
});

const statusTitle = computed(() => {
  switch (status.value.state) {
    case "running":
      return "Tor: Running";
    case "starting":
      return "Tor: Starting...";
    case "stopping":
      return "Tor: Stopping...";
    case "error":
      return "Tor: Error";
    default:
      return "Tor: Stopped";
  }
});

function togglePopover(event: MouseEvent) {
  popoverRef.value?.toggle(event);
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      class="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-700 transition-colors"
      :title="statusTitle"
      @click="togglePopover"
    >
      <i :class="statusIcon" class="text-xs" />
      <span class="text-xs text-surface-300">Tor</span>
      <i
        v-if="status.updateAvailable"
        class="fas fa-circle-up text-blue-400 text-xs ml-1"
        title="Update available"
      />
    </button>

    <Popover ref="popoverRef">
      <StatusPopover :status="status" />
    </Popover>
  </div>
</template>

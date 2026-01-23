<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";

import { useTorStore } from "@/stores";

const torStore = useTorStore();
const { testResult, isTestingConnection } = storeToRefs(torStore);

async function handleTest() {
  await torStore.testConnection();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-lg font-semibold">Connection Test</div>
    <div class="text-surface-500">Verify Tor connectivity</div>

    <div class="text-xs text-surface-400">
      Test your connection to check.torproject.org to verify Tor is working.
    </div>

    <Button
      label="Test Connection"
      icon="fas fa-bolt"
      :loading="isTestingConnection"
      @click="handleTest"
    />

    <div
      v-if="testResult !== undefined"
      class="flex flex-col gap-1 text-sm"
    >
      <div class="flex items-center gap-2">
        <i
          :class="[
            'fas',
            testResult.isTor
              ? 'fa-check-circle text-green-500'
              : 'fa-times-circle text-red-500',
          ]"
        />
        <span class="text-surface-300">
          {{
            testResult.isTor
              ? "Connected through Tor"
              : "Not connected through Tor"
          }}
        </span>
      </div>
      <div class="text-xs text-surface-400">
        IP Address: {{ testResult.ip }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import ConfigSection from "./ConfigSection.vue";
import ControlSection from "./ControlSection.vue";
import InstallSection from "./InstallSection.vue";
import TestSection from "./TestSection.vue";
import UpstreamSection from "./UpstreamSection.vue";

import { useSettingsStore, useTorStore } from "@/stores";

const settingsStore = useSettingsStore();
const torStore = useTorStore();
const { settings, isLoading } = storeToRefs(settingsStore);
const { status } = storeToRefs(torStore);
</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="flex flex-col gap-2">
      <div class="text-lg font-semibold text-surface-100">Tor</div>
      <div class="text-surface-500">Configure Tor behavior and settings</div>
    </div>

    <div v-if="isLoading" class="text-surface-400">Loading settings...</div>

    <template v-else>
      <InstallSection :settings="settings" />

      <ConfigSection v-model:settings="settings" />

      <ControlSection :status="status" />

      <UpstreamSection :settings="settings" />

      <TestSection />
    </template>
  </div>
</template>

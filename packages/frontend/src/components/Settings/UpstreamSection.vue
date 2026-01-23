<script setup lang="ts">
import Button from "primevue/button";
import Chip from "primevue/chip";
import InputText from "primevue/inputtext";
import { ref } from "vue";

import { useSettingsStore } from "@/stores";
import type { TorSettings } from "@/types";

const props = defineProps<{
  settings: TorSettings;
}>();

const settingsStore = useSettingsStore();

const newIncludeHost = ref("");
const newExcludeHost = ref("");

async function addIncludeHost() {
  const host = newIncludeHost.value.trim();
  if (host === "") return;
  if (props.settings.includeHosts.includes(host)) return;

  const newHosts = [...props.settings.includeHosts, host];
  await settingsStore.updateUpstreamScope(
    newHosts,
    props.settings.excludeHosts,
  );
  newIncludeHost.value = "";
}

async function removeIncludeHost(host: string) {
  if (host === "check.torproject.org") return;
  const newHosts = props.settings.includeHosts.filter((h) => h !== host);
  await settingsStore.updateUpstreamScope(
    newHosts,
    props.settings.excludeHosts,
  );
}

async function addExcludeHost() {
  const host = newExcludeHost.value.trim();
  if (host === "") return;
  if (props.settings.excludeHosts.includes(host)) return;

  const newHosts = [...props.settings.excludeHosts, host];
  await settingsStore.updateUpstreamScope(
    props.settings.includeHosts,
    newHosts,
  );
  newExcludeHost.value = "";
}

async function removeExcludeHost(host: string) {
  const newHosts = props.settings.excludeHosts.filter((h) => h !== host);
  await settingsStore.updateUpstreamScope(
    props.settings.includeHosts,
    newHosts,
  );
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="text-lg font-semibold">Upstream Proxy Scope</div>

    <div class="flex flex-col gap-2">
      <div class="text-xs text-surface-400">
        Include hosts (traffic routed through Tor):
      </div>
      <div class="flex flex-wrap gap-1">
        <Chip
          v-for="host in settings.includeHosts"
          :key="host"
          :label="host"
          :removable="host !== 'check.torproject.org'"
          @remove="removeIncludeHost(host)"
        />
      </div>
      <div class="flex gap-2">
        <InputText
          v-model="newIncludeHost"
          placeholder="Add hostname..."
          class="flex-1"
          @keyup.enter="addIncludeHost"
        />
        <Button
          icon="fas fa-plus"
          severity="secondary"
          @click="addIncludeHost"
        />
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-xs text-surface-400">
        Exclude hosts (traffic NOT routed through Tor):
      </div>
      <div class="flex flex-wrap gap-1">
        <Chip
          v-for="host in settings.excludeHosts"
          :key="host"
          :label="host"
          removable
          @remove="removeExcludeHost(host)"
        />
        <span
          v-if="settings.excludeHosts.length === 0"
          class="text-xs text-surface-500"
        >
          No excluded hosts
        </span>
      </div>
      <div class="flex gap-2">
        <InputText
          v-model="newExcludeHost"
          placeholder="Add hostname..."
          class="flex-1"
          @keyup.enter="addExcludeHost"
        />
        <Button
          icon="fas fa-plus"
          severity="secondary"
          @click="addExcludeHost"
        />
      </div>
    </div>
  </div>
</template>

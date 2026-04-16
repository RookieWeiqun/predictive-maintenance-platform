<!-- 设备信息步骤 -->
<template>
  <div class="device-info-step">
    <!-- 设备序列号 -->
    <div v-if="!currentPage || currentPage === 'serial'" class="form-group">
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="deviceSerial">设备序列号 <span class="required">*</span></IxFieldLabel>
        <IxInput
          id="deviceSerial"
          v-model="localFormData.deviceSerial"
          placeholder="请输入设备序列号"
        />
      </IxLayoutAuto>
    </div>

    <!-- 物理参数 -->
    <div v-if="!currentPage || currentPage === 'physical'" class="form-group">
      <h3 class="group-title">物理参数</h3>
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="dimensions">尺寸(mm)</IxFieldLabel>
        <IxInput
          id="dimensions"
          v-model="localFormData.physicalParams.dimensions"
          placeholder="例如：100x200x300"
        />
        
        <IxFieldLabel htmlFor="weight">重量(kg)</IxFieldLabel>
        <IxInput
          id="weight"
          v-model="localFormData.physicalParams.weight"
          placeholder="请输入重量"
          type="number"
        />
        
        <IxFieldLabel htmlFor="appearance">外观状况</IxFieldLabel>
        <IxSelect
          id="appearance"
          v-model="localFormData.physicalParams.appearance"
          placeholder="请选择外观状况"
        >
          <IxSelectItem value="good" label="良好" />
          <IxSelectItem value="normal" label="一般" />
          <IxSelectItem value="poor" label="较差" />
        </IxSelect>
        
        <IxFieldLabel htmlFor="physicalNotes">备注</IxFieldLabel>
        <IxTextarea
          id="physicalNotes"
          v-model="localFormData.physicalParams.notes"
          placeholder="请输入备注信息"
          rows="3"
        />
      </IxLayoutAuto>
    </div>

    <!-- 电气参数 -->
    <div v-if="!currentPage || currentPage === 'electrical'" class="form-group">
      <h3 class="group-title">电气参数</h3>
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="voltage">电压(V)</IxFieldLabel>
        <IxInput
          id="voltage"
          v-model="localFormData.electricalParams.voltage"
          placeholder="请输入电压值"
          type="number"
        />
        
        <IxFieldLabel htmlFor="current">电流(A)</IxFieldLabel>
        <IxInput
          id="current"
          v-model="localFormData.electricalParams.current"
          placeholder="请输入电流值"
          type="number"
        />
        
        <IxFieldLabel htmlFor="power">功率(W)</IxFieldLabel>
        <IxInput
          id="power"
          v-model="localFormData.electricalParams.power"
          placeholder="请输入功率值"
          type="number"
        />
        
        <IxFieldLabel htmlFor="grounding">接地电阻(Ω)</IxFieldLabel>
        <IxInput
          id="grounding"
          v-model="localFormData.electricalParams.grounding"
          placeholder="请输入接地电阻值"
          type="number"
        />
        
        <IxFieldLabel htmlFor="electricalNotes">备注</IxFieldLabel>
        <IxTextarea
          id="electricalNotes"
          v-model="localFormData.electricalParams.notes"
          placeholder="请输入备注信息"
          rows="3"
        />
      </IxLayoutAuto>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IxInput, IxSelect, IxSelectItem, IxTextarea, IxLayoutAuto, IxFieldLabel } from '@siemens/ix-vue';

const props = defineProps<{
  formData: any;
  taskInfo?: any;
  currentPage?: string;
}>();

const emit = defineEmits<{
  'update:device-serial': [value: string];
  'update:physical-params': [data: any];
  'update:electrical-params': [data: any];
}>();

const localFormData = ref({
  deviceSerial: props.formData.deviceSerial || '',
  physicalParams: { ...props.formData.physicalParams },
  electricalParams: { ...props.formData.electricalParams },
});

watch(() => props.formData, (newData) => {
  localFormData.value = {
    deviceSerial: newData.deviceSerial || '',
    physicalParams: { ...newData.physicalParams },
    electricalParams: { ...newData.electricalParams },
  };
}, { deep: true });

watch(() => localFormData.value.deviceSerial, (newValue) => {
  emit('update:device-serial', newValue);
});

watch(() => localFormData.value.physicalParams, (newData) => {
  emit('update:physical-params', newData);
}, { deep: true });

watch(() => localFormData.value.electricalParams, (newData) => {
  emit('update:electrical-params', newData);
}, { deep: true });
</script>

<style scoped>
.device-info-step {
  padding: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.group-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--theme-color-text);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.required {
  color: var(--theme-color-alarm);
}
</style>

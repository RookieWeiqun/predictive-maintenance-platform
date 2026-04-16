<!-- 基本信息步骤 -->
<template>
  <div class="basic-info-step">
    <!-- 环境数据 -->
    <div v-if="!currentPage || currentPage === 'environment'" class="form-group">
      <h3 class="group-title">环境数据</h3>
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="temperature">温度(°C)</IxFieldLabel>
        <IxInput
          id="temperature"
          v-model="localFormData.environmentData.temperature"
          placeholder="请输入温度"
          type="number"
        />
        
        <IxFieldLabel htmlFor="humidity">湿度(%)</IxFieldLabel>
        <IxInput
          id="humidity"
          v-model="localFormData.environmentData.humidity"
          placeholder="请输入湿度"
          type="number"
        />
        
        <IxFieldLabel htmlFor="dustLevel">粉尘等级</IxFieldLabel>
        <IxSelect
          id="dustLevel"
          v-model="localFormData.environmentData.dustLevel"
          placeholder="请选择粉尘等级"
        >
          <IxSelectItem value="low" label="低" />
          <IxSelectItem value="medium" label="中" />
          <IxSelectItem value="high" label="高" />
        </IxSelect>
        
        <IxFieldLabel htmlFor="sealed">是否封闭</IxFieldLabel>
        <IxSelect
          id="sealed"
          v-model="localFormData.environmentData.sealed"
          placeholder="请选择"
        >
          <IxSelectItem value="yes" label="是" />
          <IxSelectItem value="no" label="否" />
        </IxSelect>
        
        <IxFieldLabel htmlFor="envNotes">备注</IxFieldLabel>
        <IxTextarea
          id="envNotes"
          v-model="localFormData.environmentData.notes"
          placeholder="请输入备注信息"
          rows="3"
        />
      </IxLayoutAuto>
    </div>

    <!-- 车间数据 -->
    <div v-if="!currentPage || currentPage === 'workshop'" class="form-group">
      <h3 class="group-title">车间数据</h3>
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="workshopName">车间名称</IxFieldLabel>
        <IxInput
          id="workshopName"
          v-model="localFormData.workshopData.workshopName"
          placeholder="请输入车间名称"
        />
        
        <IxFieldLabel htmlFor="location">位置</IxFieldLabel>
        <IxInput
          id="location"
          v-model="localFormData.workshopData.location"
          placeholder="请输入位置信息"
        />
        
        <IxFieldLabel htmlFor="workshopNotes">备注</IxFieldLabel>
        <IxTextarea
          id="workshopNotes"
          v-model="localFormData.workshopData.notes"
          placeholder="请输入备注信息"
          rows="3"
        />
      </IxLayoutAuto>
    </div>

    <!-- 柜体情况 -->
    <div v-if="!currentPage || currentPage === 'cabinet'" class="form-group">
      <h3 class="group-title">柜体情况</h3>
      <IxLayoutAuto>
        <IxFieldLabel htmlFor="cabinetType">柜体类型</IxFieldLabel>
        <IxInput
          id="cabinetType"
          v-model="localFormData.cabinetData.cabinetType"
          placeholder="请输入柜体类型"
        />
        
        <IxFieldLabel htmlFor="cabinetCondition">柜体状况</IxFieldLabel>
        <IxSelect
          id="cabinetCondition"
          v-model="localFormData.cabinetData.condition"
          placeholder="请选择柜体状况"
        >
          <IxSelectItem value="good" label="良好" />
          <IxSelectItem value="normal" label="一般" />
          <IxSelectItem value="poor" label="较差" />
        </IxSelect>
        
        <IxFieldLabel htmlFor="cabinetNotes">备注</IxFieldLabel>
        <IxTextarea
          id="cabinetNotes"
          v-model="localFormData.cabinetData.notes"
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
  currentPage?: string;
}>();

const emit = defineEmits<{
  'update:environment-data': [data: any];
  'update:workshop-data': [data: any];
  'update:cabinet-data': [data: any];
}>();

const localFormData = ref({
  environmentData: { ...props.formData.environmentData },
  workshopData: { ...props.formData.workshopData },
  cabinetData: { ...props.formData.cabinetData },
});

watch(() => props.formData, (newData) => {
  localFormData.value = {
    environmentData: { ...newData.environmentData },
    workshopData: { ...newData.workshopData },
    cabinetData: { ...newData.cabinetData },
  };
}, { deep: true });

watch(() => localFormData.value.environmentData, (newData) => {
  emit('update:environment-data', newData);
}, { deep: true });

watch(() => localFormData.value.workshopData, (newData) => {
  emit('update:workshop-data', newData);
}, { deep: true });

watch(() => localFormData.value.cabinetData, (newData) => {
  emit('update:cabinet-data', newData);
}, { deep: true });
</script>

<style scoped>
.basic-info-step {
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
</style>

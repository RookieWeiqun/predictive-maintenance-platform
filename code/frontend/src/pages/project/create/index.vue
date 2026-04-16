<!-- 新建项目页 -->
<template>
  <div>
    <IxContentHeader header-title="新建项目">
      <IxButton variant="secondary" @click="saveDraft">保存草稿</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 流程步骤指示器 -->
        <div class="workflow-steps-container">
          <IxWorkflowSteps>
            <IxWorkflowStep 
              v-for="(step, index) in workflowSteps" 
              :key="index"
              :status="getStepStatus(index) as 'done' | 'open' | undefined"
              :disabled="index > currentStep"
              @click="handleStepClick(index)"
            >
              {{ step.title }}
            </IxWorkflowStep>
          </IxWorkflowSteps>
        </div>

        <!-- 表单内容区域 -->
        <div class="form-container">
          <!-- 第一步：基本信息 -->
          <BasicInfoStep 
            v-if="currentStep === 0" 
            :form-data="formData"
            @update:project-name="formData.projectName = $event"
            @update:customer-id="formData.customerId = $event"
            @update:factory="formData.factory = $event"
            @update:project-manager-id="formData.projectManagerId = $event"
            @update:chief-engineer-id="formData.chiefEngineerId = $event"
            @update:execution-engineers="formData.executionEngineers = $event"
          />

          <!-- 第二步：选择设备 -->
          <DeviceSelectionStep
            v-if="currentStep === 1"
            :customer-id="formData.customerId"
            :project-devices="deviceList"
            :get-category-name="getCategoryName"
            :get-sub-category-name="getSubCategoryName"
            @add-devices="handleAddDevices"
            @show-add-modal="showAddDeviceModal = true"
            @edit-device="editDevice"
            @remove-device="removeDevice"
            @clear-devices="clearDeviceList"
          />

          <!-- 第三步：匹配方案 -->
          <SchemeMatchingStep
            v-if="currentStep === 2"
            :devices="deviceList"
            :selected-scheme-id="formData.maintenanceSchemeId"
            :scheme-tree-model="schemeTreeModel"
            :scheme-tree-context="schemeTreeContext"
            @select-scheme="handleSelectScheme"
            @update-tree-context="schemeTreeContext = $event"
          />

          <!-- 第四步：调整方案 -->
          <SchemeAdjustmentStep
            v-if="currentStep === 3"
            :adjusted-scheme-tree-model="adjustedSchemeTreeModel"
            :adjusted-scheme-tree-context="adjustedSchemeTreeContext"
            :original-scheme-items="originalSchemeItems"
            :devices="deviceList"
            :selected-scheme-id="formData.maintenanceSchemeId"
            @update-tree-context="adjustedSchemeTreeContext = $event"
            @reset-scheme="resetScheme"
            @add-custom-item="addCustomItem"
            @update-items="adjustedSchemeItems = $event"
            @select-scheme="handleSelectScheme"
          />

          <!-- 第五步：确认方案 -->
          <SchemeConfirmationStep
            v-if="currentStep === 4"
            :form-data="formData"
            :devices="deviceList"
            :adjusted-scheme-tree-model="adjustedSchemeTreeModel"
            :adjusted-scheme-tree-context="adjustedSchemeTreeContext"
            :checked-items="checkedItems"
            @update-tree-context="adjustedSchemeTreeContext = $event"
          />

          <!-- 操作按钮 -->
          <div class="form-actions">
            <IxButton 
              variant="secondary" 
              @click="handlePrevious"
              :disabled="currentStep === 0"
            >
              上一步
            </IxButton>
            <IxButton 
              variant="primary" 
              @click="handleNext"
            >
              {{ currentStep === 4 ? '创建项目' : '下一步' }}
            </IxButton>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 手动创建设备模态框 -->
    <AddDeviceModal
      v-model="showAddDeviceModal"
      :editing-device="editingDevice"
      @submit="handleDeviceSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { TreeModel, TreeContext } from '@siemens/ix';
import {
  IxContentHeader,
  IxButton,
  IxWorkflowStep,
  IxWorkflowSteps,
} from "@siemens/ix-vue";
import BasicInfoStep from './components/BasicInfoStep.vue';
import DeviceSelectionStep from './components/DeviceSelectionStep.vue';
import SchemeMatchingStep from './components/SchemeMatchingStep.vue';
import SchemeAdjustmentStep from './components/SchemeAdjustmentStep.vue';
import SchemeConfirmationStep from './components/SchemeConfirmationStep.vue';
import AddDeviceModal from './components/AddDeviceModal.vue';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';

const router = useRouter();

// 流程步骤定义
const workflowSteps = [
  { title: '基本信息', description: '填写项目基本信息' },
  { title: '选择设备', description: '手动创建或批量导入设备' },
  { title: '匹配方案', description: '根据设备信息匹配维护方案' },
  { title: '调整方案', description: '调整维护方案' },
  { title: '确认方案', description: '预览并确认最终方案' },
];

const currentStep = ref(0);

// 表单数据
const formData = ref({
  projectName: '',
  customerId: '',
  factory: '',
  projectManagerId: '',
  chiefEngineerId: '',
  executionEngineers: [] as string[],
  maintenanceSchemeId: '',
});

// 设备列表
interface Device {
  id: string;
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  assignedEngineerId?: string;
  factoryName?: string;
  workshopName?: string;
}

const deviceList = ref<Device[]>([]);
const showAddDeviceModal = ref(false);
const editingDeviceIndex = ref<number | null>(null);

// 方案相关
const schemeTreeModel = ref<TreeModel<any> | undefined>();
const schemeTreeContext = ref<TreeContext | undefined>();
const adjustedSchemeTreeModel = ref<TreeModel<any> | undefined>();
const adjustedSchemeTreeContext = ref<TreeContext | undefined>();
const checkedItems = ref<string[]>([]);
const originalSchemeItems = ref<any[]>([]);
const adjustedSchemeItems = ref<any[]>([]);

// 辅助方法
const getCategoryName = (categoryId: string) => {
  const category = productCategoriesData.categories.find(c => c.id === categoryId);
  return category?.name || '-';
};

const getSubCategoryName = (categoryId: string, subCategoryId: string) => {
  const category = productCategoriesData.categories.find(c => c.id === categoryId);
  const subCategory = category?.subCategories.find(sc => sc.id === subCategoryId);
  return subCategory?.name || '-';
};

// 设备管理
const handleAddDevices = (devices: Device[]) => {
  devices.forEach(device => {
    const exists = deviceList.value.some(d => 
      d.model === device.model && 
      d.factoryName === device.factoryName &&
      d.workshopName === device.workshopName
    );
    if (!exists) {
      deviceList.value.push(device);
    }
  });
};

const editDevice = (index: number) => {
  editingDeviceIndex.value = index;
  showAddDeviceModal.value = true;
};

const removeDevice = (index: number) => {
  if (confirm('确定要删除这台设备吗？')) {
    deviceList.value.splice(index, 1);
  }
};

const clearDeviceList = () => {
  if (confirm('确定要清空所有设备吗？')) {
    deviceList.value = [];
  }
};

const handleDeviceSubmit = (deviceData: {
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
  quantity: number;
}) => {
  const device: Device = {
    id: `device-${Date.now()}`,
    ...deviceData,
  };
  
  if (editingDeviceIndex.value !== null) {
    deviceList.value[editingDeviceIndex.value] = device;
    editingDeviceIndex.value = null;
  } else {
    deviceList.value.push(device);
  }
  
  showAddDeviceModal.value = false;
};

const editingDevice = computed(() => {
  if (editingDeviceIndex.value === null) return null;
  return deviceList.value[editingDeviceIndex.value];
});

// 方案管理
const handleSelectScheme = (schemeId: string) => {
  formData.value.maintenanceSchemeId = schemeId;
};

const resetScheme = () => {
  if (formData.value.maintenanceSchemeId) {
    const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
    const scheme = schemes.find(s => s.id === formData.value.maintenanceSchemeId);
    if (scheme && scheme.items) {
      adjustedSchemeTreeModel.value = convertSchemeToTreeModel(scheme.items);
      checkedItems.value = getAllRequiredItemIdsFromModel(adjustedSchemeTreeModel.value);
      // 重置方案项目数据
      originalSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
      adjustedSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
    }
  }
};

const addCustomItem = () => {
  console.log('添加自定义项目');
};

// 监听方案变化
watch(() => formData.value.maintenanceSchemeId, (newSchemeId) => {
  if (newSchemeId) {
    const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
    const scheme = schemes.find(s => s.id === newSchemeId);
    if (scheme && scheme.items) {
      schemeTreeModel.value = convertSchemeToTreeModel(scheme.items);
      adjustedSchemeTreeModel.value = convertSchemeToTreeModel(scheme.items);
      checkedItems.value = getAllRequiredItemIdsFromModel(adjustedSchemeTreeModel.value);
      // 保存原始方案项目数据
      originalSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
      adjustedSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
    } else {
      schemeTreeModel.value = undefined;
      adjustedSchemeTreeModel.value = undefined;
      originalSchemeItems.value = [];
      adjustedSchemeItems.value = [];
    }
  } else {
    schemeTreeModel.value = undefined;
    adjustedSchemeTreeModel.value = undefined;
    originalSchemeItems.value = [];
    adjustedSchemeItems.value = [];
  }
});

// 监听设备列表变化，自动匹配方案
watch([() => currentStep.value, () => deviceList.value], ([step, devices]) => {
  if (step === 2 && devices.length > 0) {
    const models = devices.map(d => d.model).filter(Boolean);
    const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
    const matchedSchemes = schemes.filter(s => 
      models.includes(s.model)
    );
    if (matchedSchemes.length > 0 && !formData.value.maintenanceSchemeId) {
      formData.value.maintenanceSchemeId = matchedSchemes[0].id;
    }
  }
});

// 方案转换函数
function convertSchemeToTreeModel(items: any[]): TreeModel<any> {
  const model: TreeModel<any> = {
    root: {
      id: 'root',
      data: { name: '' },
      hasChildren: items.length > 0,
      children: items.map(item => item.id),
    },
  };
  
  function processItems(items: any[]) {
    items.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      model[item.id] = {
        id: item.id,
        data: { 
          name: item.name,
          required: item.required !== false,
        },
        hasChildren: hasChildren,
        children: hasChildren ? item.children.map((child: any) => child.id) : [],
      };
      
      if (hasChildren) {
        processItems(item.children);
      }
    });
  }
  
  processItems(items);
  return model;
}

function getAllRequiredItemIdsFromModel(model: TreeModel<any>): string[] {
  const ids: string[] = [];
  function traverse(nodeId: string) {
    const node = model[nodeId];
    if (node && node.data.required !== false) {
      ids.push(nodeId);
    }
    if (node && node.children) {
      node.children.forEach(childId => traverse(childId));
    }
  }
  if (model.root && model.root.children) {
    model.root.children.forEach(childId => traverse(childId));
  }
  return ids;
}

// 步骤管理
const getStepStatus = (index: number): 'done' | 'open' | undefined => {
  if (index < currentStep.value) {
    return 'done';
  } else if (index === currentStep.value) {
    return 'open';
  } else {
    return undefined;
  }
};

const handleStepClick = (index: number) => {
  if (index <= currentStep.value) {
    currentStep.value = index;
  }
};

const handlePrevious = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const handleNext = () => {
  // 表单验证
  if (currentStep.value === 0) {
    // if (!formData.value.projectName || !formData.value.customerId || !formData.value.factory || 
    //     !formData.value.projectManagerId || !formData.value.chiefEngineerId || 
    //     formData.value.executionEngineers.length === 0) 
    if (!formData.value.customerId)
        {
      alert('请填写完整的基本信息');
      return;
    }
  } else if (currentStep.value === 1) {
    if (deviceList.value.length === 0) {
      alert('请至少添加一台设备');
      return;
    }
  } else if (currentStep.value === 2) {
    if (!formData.value.maintenanceSchemeId) {
      alert('请选择维护方案');
      return;
    }
  }
  
  if (currentStep.value < workflowSteps.length - 1) {
    currentStep.value++;
  } else {
    createProject();
  }
};

const saveDraft = () => {
  console.log('保存草稿', formData.value);
};

const createProject = () => {
  console.log('创建项目', formData.value);
  router.push('/project/list');
};
</script>

<style scoped>
.page-section {
  padding: 1rem;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.workflow-steps-container {
  /* margin-bottom: 1rem; */
  padding: 1.5rem;
  background: var(--theme-color-soft);
  border-radius: 0.5rem;
}

.form-container {
  padding: 0.5rem;
  background: var(--theme-color-background);
  border-radius: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--theme-color-soft-border);
}
</style>

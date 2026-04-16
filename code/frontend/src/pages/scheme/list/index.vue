<!-- 标准方案维护页面 -->
<template>
  <div class="scheme-maintenance-page">
    <IxContentHeader header-title="标准方案维护">
      <IxButton variant="primary" :icon="iconAdd" @click="handleAddPeripheralScheme" style="margin-right: 8px;">新建外围方案</IxButton>
      <IxButton variant="primary" :icon="iconAdd" @click="handleAddEquipmentScheme">新建设备方案</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 搜索和筛选区域 -->
        <div class="filter-section">
          <IxInput 
            v-model="searchText" 
            placeholder="搜索方案名称或型号" 
            style="flex: 1; max-width: 300px;" 
          />
          <IxSelect v-model="selectedCategory" placeholder="全部分类" style="min-width: 150px;">
            <IxSelectItem label="全部分类" value="" />
            <IxSelectItem 
              v-for="category in categories" 
              :key="category.id" 
              :label="category.name" 
              :value="category.id" 
            />
          </IxSelect>
          <IxButton variant="secondary" @click="handleSearch">搜索</IxButton>
        </div>

        <!-- 方案列表表格 -->
        <div class="table-container">
          <AgGridVue
            v-if="gridOptions"
            style="height: 600px; width: 100%"
            :gridOptions="gridOptions"
            @grid-ready="handleGridReady"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxContentHeader, IxButton, IxInput, IxSelect, IxSelectItem } from "@siemens/ix-vue";
import { iconAdd } from "@siemens/ix-icons/icons";
import { getAllSchemes } from '@/mockdata/scheme/index';
import productCategoriesData from '@/mockdata/common/productCategories.json';

ModuleRegistry.registerModules([AllCommunityModule]);

const router = useRouter();

// 搜索文本
const searchText = ref('');
const selectedCategory = ref('');

// 分类列表
const categories = productCategoriesData.categories;

// 获取分类名称
const getCategoryName = (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId);
  return category?.name || '-';
};

// 获取子分类名称
const getSubCategoryName = (subCategoryId: string) => {
  for (const category of categories) {
    const subCategory = category.subCategories.find(sc => sc.id === subCategoryId);
    if (subCategory) {
      return subCategory.name;
    }
  }
  return '-';
};

// 统计检测项目数量（只统计有type和required字段的项目）
const countDetectionItems = (items: any[]): number => {
  let count = 0;
  items.forEach(item => {
    // 判断是否为检测项目
    if (item.type !== undefined && item.required !== undefined) {
      count++;
    }
    if (item.children && item.children.length > 0) {
      count += countDetectionItems(item.children);
    }
  });
  return count;
};

// 获取方案类型标签
const getSchemeTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'peripheral': '外围检测',
    'equipment': '设备检测',
  };
  return typeMap[type] || type;
};

// 获取产品类型（合并分类和子分类）
const getProductType = (scheme: any) => {
  if (scheme.type === 'peripheral') {
    return '-'; // 外围检测方案不显示产品类型
  }
  const categoryName = getCategoryName(scheme.categoryId);
  const subCategoryName = getSubCategoryName(scheme.subCategoryId);
  if (categoryName && subCategoryName) {
    return `${categoryName}/${subCategoryName}`;
  } else if (categoryName) {
    return categoryName;
  }
  return '-';
};

// 过滤后的方案列表
const filteredSchemes = computed(() => {
  // 从 scheme 文件夹加载所有方案
  let schemes = getAllSchemes();
  
  // 按分类筛选
  if (selectedCategory.value) {
    schemes = schemes.filter(s => s.categoryId === selectedCategory.value);
  }
  
  // 按搜索文本筛选
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase();
    schemes = schemes.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      (s.model && s.model.toLowerCase().includes(searchLower))
    );
  }
  
  return schemes;
});

// ag-grid 配置
const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

// 查看方案
const handleView = (schemeId: string) => {
  router.push(`/scheme/view/${schemeId}`);
};

// 编辑方案
const handleEdit = (schemeId: string) => {
  router.push(`/scheme/edit/${schemeId}`);
};

// 删除方案
const handleDelete = (schemeId: string) => {
  // TODO: 实现删除功能
  if (confirm('确定要删除这个方案吗？')) {
    console.log('删除方案:', schemeId);
  }
};

// 新建外围方案
const handleAddPeripheralScheme = () => {
  router.push('/scheme/create/peripheral');
};

// 新建设备方案
const handleAddEquipmentScheme = () => {
  router.push('/scheme/create/equipment');
};

// 搜索
const handleSearch = () => {
  if (gridApi.value) {
    gridApi.value.setRowData(filteredSchemes.value);
  }
};

// 处理 Grid Ready 事件
const handleGridReady = (params: any) => {
  if (params && params.api) {
    gridApi.value = params.api;
  }
};

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    columnDefs: [
      {
        field: 'name',
        headerName: '方案名称',
        resizable: true,
        sortable: true,
        filter: true,
        width: 250,
        cellStyle: { fontWeight: 500 },
      },
      {
        headerName: '方案类型',
        resizable: true,
        sortable: true,
        filter: true,
        width: 120,
        valueGetter: (params: any) => {
          return getSchemeTypeLabel(params.data.type);
        },
      },
      {
        headerName: '产品类型',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        valueGetter: (params: any) => {
          return getProductType(params.data);
        },
      },
      {
        field: 'model',
        headerName: '型号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        valueGetter: (params: any) => {
          return params.data.model || '-';
        },
      },
      {
        headerName: '检测项数量',
        resizable: true,
        sortable: true,
        width: 120,
        valueGetter: (params: any) => {
          return params.data.items ? countDetectionItems(params.data.items) : 0;
        },
      },
      {
        field: 'actions',
        headerName: '操作',
        resizable: false,
        sortable: false,
        filter: false,
        width: 240,
        cellRenderer: (params: any) => {
          const schemeId = params.data.id;
          return `
            <div class="ag-action-buttons">
              <button class="ag-action-btn ag-action-btn-view" data-action="view" data-id="${schemeId}">查看</button>
              <button class="ag-action-btn ag-action-btn-edit" data-action="edit" data-id="${schemeId}">编辑</button>
              <button class="ag-action-btn ag-action-btn-delete" data-action="delete" data-id="${schemeId}">删除</button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          if (params.event?.target?.classList.contains('ag-action-btn')) {
            const action = params.event.target.getAttribute('data-action');
            const id = params.event.target.getAttribute('data-id');
            if (action === 'view') {
              handleView(id);
            } else if (action === 'edit') {
              handleEdit(id);
            } else if (action === 'delete') {
              handleDelete(id);
            }
          }
        },
      },
    ],
    rowData: filteredSchemes.value,
    suppressCellFocus: true,
  };
});

// 监听搜索和筛选变化
watch([searchText, selectedCategory], () => {
  if (gridApi.value) {
    gridApi.value.setRowData(filteredSchemes.value);
  }
});
</script>

<style scoped>
.page-section {
  padding-top: 1rem;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  margin-bottom: 1rem;
}

.table-container {
  margin-top: 1rem;
}
</style>

<style>
/* 全局样式，用于 ag-grid 内部的按钮 */
.ag-action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  height: 100%;
  padding: 0.25rem 0;
}

.ag-action-btn {
  background-color: transparent;
  border: 1px solid var(--theme-color-soft-border);
  color: var(--theme-color-text);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  min-height: 2rem;
  white-space: nowrap;
  font-family: inherit;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ag-action-btn:hover {
  background-color: var(--theme-color-soft-hover);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:active {
  background-color: var(--theme-color-soft-active);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:focus {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.ag-action-btn:focus:not(:focus-visible) {
  outline: none;
}

.ag-action-btn-view {
  color: var(--theme-color-primary);
  border-color: var(--theme-color-primary-soft-border, var(--theme-color-soft-border));
}

.ag-action-btn-view:hover {
  background-color: var(--theme-color-primary-soft, var(--theme-color-soft-hover));
  border-color: var(--theme-color-primary);
}

.ag-action-btn-delete {
  color: var(--theme-color-alarm);
  border-color: var(--theme-color-alarm-soft-border, var(--theme-color-soft-border));
}

.ag-action-btn-delete:hover {
  background-color: var(--theme-color-alarm-soft, var(--theme-color-soft-hover));
  border-color: var(--theme-color-alarm);
}
</style>

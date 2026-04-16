// 方案数据管理工具
import atomicPeripheral1 from './atomic-peripheral-1.json';
import atomicEquipment1 from './atomic-equipment-1.json';
import atomicEquipment2 from './atomic-equipment-2.json';

// 方案数据映射
const schemeDataMap: Record<string, any> = {
  'atomic-peripheral-1': atomicPeripheral1,
  'atomic-equipment-1': atomicEquipment1,
  'atomic-equipment-2': atomicEquipment2,
};

// 根据 ID 获取方案数据
export function getSchemeById(id: string): any | null {
  // 先从 localStorage 中查找（可能被修改过）
  const updatesKey = 'scheme_updates';
  const updates = localStorage.getItem(updatesKey);
  if (updates) {
    try {
      const updatesObj = JSON.parse(updates);
      if (updatesObj[id]) {
        return updatesObj[id];
      }
    } catch (e) {
      console.error('读取 localStorage 方案更新失败:', e);
    }
  }
  
  // 从静态数据中查找
  return schemeDataMap[id] || null;
}

// 获取所有方案数据
export function getAllSchemes(): any[] {
  // 先从 localStorage 中查找（可能被修改过）
  const updatesKey = 'scheme_updates';
  let updates: Record<string, any> = {};
  
  try {
    const existing = localStorage.getItem(updatesKey);
    if (existing) {
      updates = JSON.parse(existing);
    }
  } catch (e) {
    console.error('读取 localStorage 方案更新失败:', e);
  }
  
  // 合并静态数据和 localStorage 中的更新
  const allSchemes: any[] = [];
  const schemeIds = new Set<string>();
  
  // 先添加所有静态数据
  Object.values(schemeDataMap).forEach((scheme: any) => {
    if (scheme && scheme.id) {
      schemeIds.add(scheme.id);
      // 如果 localStorage 中有更新，使用更新后的数据
      if (updates[scheme.id]) {
        allSchemes.push(updates[scheme.id]);
      } else {
        allSchemes.push(scheme);
      }
    }
  });
  
  // 添加 localStorage 中新增的方案（不在静态数据中的）
  Object.values(updates).forEach((scheme: any) => {
    if (scheme && scheme.id && !schemeIds.has(scheme.id)) {
      allSchemes.push(scheme);
    }
  });
  
  return allSchemes;
}

// 保存方案数据
export function saveScheme(schemeData: any): void {
  if (!schemeData || !schemeData.id) {
    console.error('方案数据无效');
    return;
  }
  
  // 保存到 localStorage（模拟保存到服务器）
  const updatesKey = 'scheme_updates';
  let updates: Record<string, any> = {};
  
  try {
    const existing = localStorage.getItem(updatesKey);
    if (existing) {
      updates = JSON.parse(existing);
    }
  } catch (e) {
    console.error('读取 localStorage 失败:', e);
  }
  
  // 更新方案数据
  updates[schemeData.id] = schemeData;
  
  try {
    localStorage.setItem(updatesKey, JSON.stringify(updates));
    console.log(`方案 ${schemeData.id} 已保存到 localStorage`);
  } catch (e) {
    console.error('保存到 localStorage 失败:', e);
  }
  
  // 注意：在开发环境中，无法直接修改 JSON 文件
  // 如果需要持久化到文件，需要后端 API 支持
}

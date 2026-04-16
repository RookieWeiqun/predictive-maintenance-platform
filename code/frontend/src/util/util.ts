/*
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { showToast } from "@siemens/ix-vue";
import { iconSingleCheck } from "@siemens/ix-icons/icons";

export function toKebabCase(normalString: string): string {
  return normalString
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function showSuccessToast(message: string) {
  showToast({
    message: message,
    icon: iconSingleCheck,
    iconColor: "color-success",
  });
}

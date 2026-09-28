import { createServerFn } from "@tanstack/react-start";

import {
  beginDriveAuthorization as beginDriveAuthorizationOnServer,
  cancelDriveSetup as cancelDriveSetupOnServer,
  completeDriveAuthorization as completeDriveAuthorizationOnServer,
  completeDriveSetup as completeDriveSetupOnServer,
  getDrivePickerConfiguration as getDrivePickerConfigurationOnServer,
  getDriveSettings as getDriveSettingsOnServer,
  getDriveStorageStatus as getDriveStorageStatusOnServer,
  testConfiguredDriveConnection as testConfiguredDriveConnectionOnServer,
} from "./drive.server";

export const getDriveStorageStatus = createServerFn({ method: "GET" }).handler(() => {
  return getDriveStorageStatusOnServer();
});

export const getDriveSettings = createServerFn({ method: "GET" }).handler(async () => {
  return await getDriveSettingsOnServer();
});

export const beginDriveAuthorization = createServerFn({ method: "GET" }).handler(async () => {
  return await beginDriveAuthorizationOnServer();
});

export const cancelDriveSetup = createServerFn({ method: "POST" }).handler(async () => {
  await cancelDriveSetupOnServer();
});

export const completeDriveAuthorization = createServerFn({ method: "GET" }).handler(async () => {
  return await completeDriveAuthorizationOnServer();
});

export const getDrivePickerConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  return await getDrivePickerConfigurationOnServer();
});

export const completeDriveSetup = createServerFn({ method: "POST" })
  .validator((data: { folderId: string }) => {
    if (!data.folderId.trim()) throw new Error("A Drive folder is required.");
    return data;
  })
  .handler(async ({ data }) => {
    return await completeDriveSetupOnServer(data.folderId);
  });

export const testConfiguredDriveConnection = createServerFn({ method: "POST" }).handler(
  async () => {
    await testConfiguredDriveConnectionOnServer();
  },
);

import { promisify } from 'util';
import * as tf from 'terraform';
import { file } from 'fs';
import { Blob } from 'zip';

const terraform = new tf.Terraform({
  binaryPath: 'terraform',
  output: {
    file: 'terraform.tfstate',
  },
});

const readFileSync = promisify(file.readFile);
const writeFile = promisify(file.writeFile);
const mkdir = promisify(file.mkdir);
const stat = promisify(file.stat);
const exists = promisify(file.exists);
const rm = promisify(file.rm);
const rmdir = promisify(file.rmdir);

async function readTfState() {
  try {
    const content = await readFileSync('terraform.tfstate');
    return tf.parse(content.toString());
  } catch (error) {
    return null;
  }
}

async function getProvider() {
  const state = await readTfState();
  if (state === null) {
    await terraform.init();
    await terraform.apply();
  }
  return terraform.provider;
}

async function createServiceAccount() {
  const provider = await getProvider();
  const account = await provider.createServiceAccount();
  return account;
}

async function getProviderInstanceState() {
  const provider = await getProvider();
  return provider.instanceState;
}

async function createResource(
  name,
  type,
  properties = {},
) {
  const provider = await getProvider();
  const resource = await provider.createResource({
    name,
    type,
    properties,
  });
  return resource;
}

async function updateResource(
  name,
  type,
  properties = {},
) {
  const provider = await getProvider();
  const resource = await provider.updateResource({
    name,
    type,
    properties,
  });
  return resource;
}

async function destroyResource(
  name,
  type,
) {
  const provider = await getProvider();
  await provider.destroyResource({
    name,
    type,
  });
}

async function createResourceGroup(
  name,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_resource_group',
    properties,
  );
  return resource;
}

async function createVirtualNetwork(
  name,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_virtual_network',
    properties,
  );
  return resource;
}

async function createSubnet(
  name,
  resourceGroup,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_subnet',
    {
      resource_group_name: resourceGroup,
      ...properties,
    },
  );
  return resource;
}

async function createNetworkInterface(
  name,
  resourceGroup,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_network_interface',
    {
      resource_group_name: resourceGroup,
      ...properties,
    },
  );
  return resource;
}

async function createVM(
  name,
  resourceGroup,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_virtual_machine',
    {
      resource_group_name: resourceGroup,
      ...properties,
    },
  );
  return resource;
}

async function createStorage(
  name,
  resourceGroup,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_storage_account',
    {
      resource_group_name: resourceGroup,
      ...properties,
    },
  );
  return resource;
}

async function createBlobStorage(
  name,
  resourceGroup,
  properties = {},
) {
  const resource = await createResource(
    name,
    'azurerm_storage_container',
    {
      storage_account_name: createStorage(
        `${name}-storage`,
        resourceGroup,
      ).name,
      ...properties,
    },
  );
  return resource;
}

async function createBlobFile(
  name,
  resourceGroup,
  blobStorage,
  content,
) {
  const blob = await createBlobStorage(
    name,
    resourceGroup,
  ).blob(name);
  await blob.uploadData(content);
  return blob;
}

async function createZipFile(
  name,
  resourceGroup,
  files = [],
) {
  const blobStorage = await createBlobStorage(
    name,
    resourceGroup,
  );
  const zip = new Blob();
  await zip.add(files);
  const blob = await blobStorage.blob(name);
  await blob.uploadData(zip);
  return blob;
}

async function readBlobFile(
  name,
  resourceGroup,
) {
  const blobStorage = await createBlobStorage(
    name,
    resourceGroup,
  );
  const blob = await blobStorage.blob(name);
  const data = await blob.downloadData();
  return data;
}

async function main() {
  await createResourceGroup(
    'test',
    {
      location: 'westeurope',
    },
  );
  await createVirtualNetwork(
    'test-vnet',
    {
      address_spaces: ['10.0.0.0/16'],
    },
  );
  await createSubnet(
    'test-subnet',
    'test',
    {
      address_prefixes: ['10.0.1.0/24'],
    },
  );
  await createNetworkInterface(
    'test-nic',
    'test',
  );
  await createVM(
    'test-vm',
    'test',
    {
      vm_size: 'Standard_DS2_v2',
    },
  );
  await createStorage(
    'test-storage',
    'test',
  );
  const blobStorage = await createBlobStorage(
    'test-blob-storage',
    'test',
  );
  const blob = await createBlobFile(
    'test-blob',
    'test',
    blobStorage,
    'Hello, Terraform!',
  );
  await createZipFile(
    'test-zip',
    'test',
    [blob],
  );
  const data = await readBlobFile(
    'test-blob',
    'test',
  );
  console.log(data.toString());
  await terraform.destroy();
}

main();
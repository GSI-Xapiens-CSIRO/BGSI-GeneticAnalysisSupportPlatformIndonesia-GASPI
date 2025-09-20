export const cpuInstanceTypes = [
  { name: 'ml.t3.medium', note: 'cheapest', ram: 4, cpu: 2, gpu: 0, vram: 0 },
  { name: 'ml.t3.large', note: '', ram: 8, cpu: 2, gpu: 0, vram: 0 },
  { name: 'ml.t3.xlarge', note: '', ram: 16, cpu: 4, gpu: 0, vram: 0 },
  { name: 'ml.t3.2xlarge', note: '', ram: 32, cpu: 8, gpu: 0, vram: 0 },
];

export const gpuInstanceTypes = [
  { name: 'ml.g5.xlarge', note: 'cheapest', ram: 16, cpu: 4, gpu: 1, vram: 1 },
  { name: 'ml.g5.2xlarge', note: '', ram: 32, cpu: 8, gpu: 1, vram: 24 },
  { name: 'ml.g5.4xlarge', note: '', ram: 64, cpu: 16, gpu: 1, vram: 24 },
  { name: 'ml.g5.8xlarge', note: '', ram: 128, cpu: 32, gpu: 1, vram: 24 },
  { name: 'ml.g5.12xlarge', note: '', ram: 192, cpu: 48, gpu: 4, vram: 96 },
  { name: 'ml.g5.16xlarge', note: '', ram: 256, cpu: 64, gpu: 1, vram: 24 },
  { name: 'ml.g5.24xlarge', note: '', ram: 384, cpu: 96, gpu: 4, vram: 96 },
  { name: 'ml.g5.48xlarge', note: '', ram: 768, cpu: 192, gpu: 8, vram: 192 },
];

export type InstanceGroups = {
  name: string;
  instances: typeof cpuInstanceTypes | typeof gpuInstanceTypes;
  gpu: boolean;
}[];

export const instanceGroups: InstanceGroups = [
  { name: 'CPU Generic', instances: cpuInstanceTypes, gpu: false },
  { name: 'GPU Accelerated', instances: gpuInstanceTypes, gpu: true },
];

export type VolumeSizes = {
  size: number;
  note: string;
}[];

export const volumeSizes: VolumeSizes = [
  { size: 5, note: '5 GB' },
  { size: 10, note: '10 GB' },
  { size: 20, note: '20 GB' },
  { size: 50, note: '50 GB' },
  { size: 100, note: '100 GB' },
  { size: 250, note: '250 GB' },
  { size: 500, note: '500 GB' },
  { size: 1 * 1024, note: '1 TB' },
  { size: 4 * 1024, note: '4 TB' },
  { size: 8 * 1024, note: '8 TB' },
  { size: 16 * 1024, note: '16 TB' },
];

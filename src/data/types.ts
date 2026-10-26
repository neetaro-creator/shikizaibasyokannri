export type VehicleId = 'tank1' | 'pump1' | 'command1' | 'ambulance1';

export interface Vehicle { id: VehicleId; name: string; type: string; model?: string }
export interface Hotspot { x: number; y: number; z: number; w: number; h: number; d: number }
export interface Location { id: string; vehicleId: VehicleId; name: string; group: string; hotspot?: Hotspot; photo?: string }
export interface Item { id: string; name: string; aliases: string[]; category: string; photo?: string; model?: string }
export interface Stock { itemId: string; locationId: string; qty?: number; qtyNote?: string }
export interface Db { vehicles: Vehicle[]; locations: Location[]; items: Item[]; stock: Stock[] }

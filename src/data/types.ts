export type VehicleId = 'tank1' | 'pump1' | 'command1' | 'ambulance1';

export interface Vehicle { id: VehicleId; name: string; type: string; model?: string }
export interface Hotspot { x: number; y: number; z: number; w: number; h: number; d: number }
/** moreHotspots:同じ場所が車内の何か所かに分かれているときの、2つ目以降の箱(3D モデル側で決める)。 */
export interface Location { id: string; vehicleId: VehicleId; name: string; group: string; hotspot?: Hotspot; moreHotspots?: Hotspot[]; photo?: string }
/** 中分類。majors はそれが入る大分類(救急・救助・火災・油漏れ・共通)で、いくつかにまたがることがある。 */
export interface Category { name: string; majors: string[] }
/** category は中分類の名前。 */
export interface Item { id: string; name: string; aliases: string[]; category: string; photo?: string; model?: string }
export interface Stock { itemId: string; locationId: string; qty?: number; qtyNote?: string }
export interface Db { vehicles: Vehicle[]; locations: Location[]; items: Item[]; stock: Stock[]; categories: Category[] }

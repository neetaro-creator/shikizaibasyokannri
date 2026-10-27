import type { Vehicle } from '../data/types';
import { h } from './dom';

/** 「信楽タンク1」→「タンク1」。車両ごとの色つき札。 */
export const shortName = (v: Vehicle) => v.name.replace(/^信楽/, '');
export const vehicleTag = (v: Vehicle) => h('span', { class: `vtag v-${v.id}` }, shortName(v));
/** 車外品の札。どの車両の点検表に載っているかは横に小さく書く。 */
export const outsideTag = () => h('span', { class: 'vtag v-outside' }, '車外');

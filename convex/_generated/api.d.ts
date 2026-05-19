/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as balanceEngine from "../balanceEngine.js";
import type * as groupDomain from "../groupDomain.js";
import type * as http from "../http.js";
import type * as memberJoinExpenseSplit from "../memberJoinExpenseSplit.js";
import type * as moneyConvex from "../moneyConvex.js";
import type * as profile from "../profile.js";
import type * as splitGroups from "../splitGroups.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  balanceEngine: typeof balanceEngine;
  groupDomain: typeof groupDomain;
  http: typeof http;
  memberJoinExpenseSplit: typeof memberJoinExpenseSplit;
  moneyConvex: typeof moneyConvex;
  profile: typeof profile;
  splitGroups: typeof splitGroups;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

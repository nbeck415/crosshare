/* eslint-disable @typescript-eslint/no-explicit-any */
import * as t from 'io-ts';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from '../firebaseConfig';
import { connectStorageEmulator, getStorage as gS } from 'firebase/storage';
import {
  connectAuthEmulator,
  getAuth as gA,
  signInAnonymously as sIA,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  Firestore,
  getFirestore,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp as FBTimestamp,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import cloneDeepWith from 'lodash/cloneDeepWith';
import { isTimestamp } from './timestamp';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

// Initialize Firebase
let App: FirebaseApp;
let db: Firestore;

const apps = getApps();
if (apps.length && apps[0]) {
  App = apps[0];
  db = getFirestore(App);
} else {
  App = initializeApp(firebaseConfig);
  db = getFirestore(App);

  // Init emulator
  if (process.env.NEXT_PUBLIC_USE_EMULATORS) {
    console.log('Connecting to emulators');
    connectFirestoreEmulator(db, 'localhost', 8080);

    const auth = gA(App);
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    });

    const storage = gS(App);
    connectStorageEmulator(storage, 'localhost', 9199);
  }
}

export const getDocId = (collectionName: string) =>
  doc(collection(db, collectionName)).id;

export const getAuth = () => gA(App);
export const getStorage = () => gS(App);

export const convertTimestamps = (data: any): Record<string, unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cloneDeepWith(data, (val) => {
    if (isTimestamp(val)) {
      return FBTimestamp.fromMillis(val.toMillis());
    }
    return undefined;
  });

export const getCollection = (collectionName: string) =>
  collection(db, collectionName).withConverter({
    toFirestore: convertTimestamps,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    fromFirestore: (s: any) => s.data(),
  });

export function getValidatedCollection<V>(
  collectionName: string,
  validator: t.Decoder<unknown, V>,
  idField: string | null = null
) {
  return collection(db, collectionName).withConverter({
    toFirestore: convertTimestamps,
    fromFirestore: (s: QueryDocumentSnapshot, options: SnapshotOptions): V => {
      let data = s.data(options);
      if (idField) {
        data = { ...data, [idField]: s.id };
      }

      const validationResult = validator.decode(data);
      if (isRight(validationResult)) {
        return validationResult.right;
      } else {
        console.error(`bad doc: ${collectionName}/${s.id}`);
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed content');
      }
    },
  });
}

export const getDocRef = (collectionName: string, docId: string) =>
  doc(getCollection(collectionName), docId);

export const setApp = (app: FirebaseApp) => {
  App = app;
};
export const setUpForSignInAnonymously = (_app: FirebaseApp, _user: User) => {
  throw new Error('For testing only');
};

export const signInAnonymously = async () => {
  const userCredential = await sIA(getAuth());
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  if (!userCredential.user) {
    throw new Error('Logged in anonymously but no user in result');
  }
  return userCredential.user;
};

export const setUserMap = (_map: Record<string, User>) => {
  /* noop */
};

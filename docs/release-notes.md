# Building and sharing an Android update

This project distributes the Android app privately as an APK through Google Drive. A Play Store account is not needed for this workflow.

## Before each release

1. Commit and push the finished app changes to `main`.
2. In the working copy used to build the APK, pull the latest `main`:

   ```sh
   git switch main
   git pull --ff-only
   ```

3. Open `android/app/build.gradle` and update the app version in `defaultConfig`:

   ```gradle
   versionCode 3
   versionName "1.2.0"
   ```

   `versionCode` must be a whole number higher than the previous release. Android uses it to decide whether an APK can update an installed app. `versionName` is the human-readable version shown to users and is also used in the APK filename. For small fixes, use the next patch version (for example, `1.1.1`) and still increment `versionCode`.

4. From the repository root, build the web app and sync its files and plugins into Android:

   ```sh
   npm ci
   npm run build
   npx cap sync android
   ```

   `npm ci` is only needed when setting up the checkout or when dependencies have changed; `npm run build` and `npx cap sync android` are needed for every release.

5. Build the release APK with Java 21. In a terminal from the repository root:

   ```sh
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
   export PATH="$JAVA_HOME/bin:$PATH"
   cd android
   ./gradlew assembleRelease
   ```

   The Android project currently fails to build with Android Studio's Java 25 runtime. If building from Android Studio, set **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** to Java 21.

6. Find the APK at:

   ```text
   android/app/build/outputs/apk/release/grocery-list-v<versionName>-release.apk
   ```

   For example, version `1.2.0` produces `grocery-list-v1.2.0-release.apk`. Upload this new file to Drive and make it clear to users that it replaces the previous download.

## Installing an update

Users download the new APK from Drive and install it over the existing app. They may need to allow installation from Drive or their browser in Android settings. They should not uninstall the old app first; uninstalling erases the locally stored grocery list.

## Keep the signing key consistent

For this private distribution workflow, the release APK uses the same local Android debug signing key as the debug APKs already shared with friends. This allows those existing installations to accept release updates without uninstalling. Keep `~/.android/debug.keystore` backed up and use the same computer/key for all future builds. If the key is lost or replaced, Android will reject updates signed with the new key, and users would have to uninstall and lose their local data before installing the differently signed app.

This signing setup is for private APK sharing. Do not use the debug key for publishing the app on Google Play.

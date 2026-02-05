# Third-Party Licenses

This application includes the following third-party software components:

## Core Dependencies

### Electron
- **Version**: 36.2.1
- **License**: MIT License
- **Copyright**: Copyright (c) Electron contributors, Copyright (c) 2013-2020 GitHub Inc.
- **Repository**: https://github.com/electron/electron

### FFmpeg (Bundled - LGPL)
- **Version**: 6.x (Latest Release)
- **License**: LGPL v2.1+
- **Copyright**: Copyright (c) 2000-2023 the FFmpeg developers
- **Repository**: https://ffmpeg.org/
- **Bundle Path**: `resources/ffmpeg/ffmpeg.exe`
- **Notice**: This application uses FFmpeg in accordance with the LGPL v2.1+ license. FFmpeg is bundled with this application for user convenience. Users may replace it with their own LGPL-compliant version.
- **Dynamic Linking**: This application dynamically links to FFmpeg, complying with LGPL requirements.
- **Source Code**: Complete FFmpeg source code is available at https://ffmpeg.org/

### howler.js
- **Version**: 2.2.4
- **License**: MIT License
- **Copyright**: Copyright (c) 2013-2020 James Simpson and GoldFire Studios, Inc.
- **Repository**: https://github.com/goldfire/howler.js

### electron-store
- **Version**: 10.0.1
- **License**: MIT License
- **Copyright**: Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
- **Repository**: https://github.com/sindresorhus/electron-store

### electron-builder
- **Version**: 24.13.3
- **License**: MIT License
- **Copyright**: Copyright (c) 2015 Loopline Systems
- **Repository**: https://github.com/electron-userland/electron-builder

### update-electron-app
- **Version**: 3.1.2
- **License**: MIT License
- **Repository**: https://github.com/electron/update-electron-app

### @deepfocus/get-windows (Optional)
- **Version**: 1.0.21
- **License**: MIT License
- **Repository**: https://github.com/deepfocus-labs/get-windows

## Audio Libraries

### (No bundled audio libraries - FFmpeg is user-provided)

## Chromium Components

This application includes Chromium components licensed under various open-source licenses.
For complete license information, see `LICENSES.chromium.html` included with the application.

## Additional Credits

- **Author**: joshxviii (dagexviii.dev@gmail.com)
- **Project Repository**: https://github.com/joshxviii/animalese-typing-desktop
- **License**: MIT License

## License Summary

- **MIT License**: Used by Electron, howler.js, electron-store, electron-builder, update-electron-app, and @deepfocus/get-windows
- **LGPL-2.1+ License**: Used by FFmpeg (dynamically linked, user-provided)

## LGPL Compliance

This application complies with the LGPL v2.1+ license for FFmpeg usage:

- **Dynamic Linking**: FFmpeg is loaded dynamically (not statically linked)
- **Bundled**: FFmpeg is bundled with this application for user convenience
- **User-Replaceable**: Users may replace FFmpeg with their own LGPL-compliant version
- **Modification**: Users can modify and recompile FFmpeg from source if needed
- **Source Availability**: Complete FFmpeg source code is available at https://ffmpeg.org/

See FFMPEG_SETUP.md for details on bundled FFmpeg and replacement instructions.

## Legal Notices

All trademarks mentioned herein are the property of their respective owners.

For questions regarding licensing, please contact: dagexviii.dev@gmail.com

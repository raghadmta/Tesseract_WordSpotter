# WordSpotter Project

## Project Overview

WordSpotter is a web application that uses Tesseract OCR to detect and highlight words (in Arabic and English) or phrases within images. The project provides two ways to perform OCR:

- Backend (Server-Side): Utilizes the [Tesseract NuGet package](https://www.nuget.org/packages/tesseract/) to run OCR on the server for process images and extract text.
- Frontend (Client-Side): Uses [Tesseract.js](https://tesseract.projectnaptha.com/), a JavaScript version of Tesseract, to perform OCR directly in the browser.

Both methods allow users to search for specific terms in an image and highlight them, offering flexibility whether the OCR runs on the server or directly on the user's device.



https://github.com/user-attachments/assets/04968839-35eb-4fb1-a138-119a3a8d98b6



## Folder Structure
```
WordSpotter/
│
├── wwwroot/
│   ├── images/
│   │   └── sample.jpg // the img we are testing on 
│   ├── js/
│   │   ├── JSTesseract.js // script for the front-end Tesseract.
│   └── └── Tesseract.js // script for the back-end Tesseract.
│
├── Controllers/
│   ├── HomeController.cs
│   ├── JSTesseractController.cs
│   └── TesseractController.cs
│
├── tessdata/
│   │   ├── ara.traineddata
│   │   └── eng.traineddata
│
├── Views/
│   └── (Razor view files here)
└── README.md

```
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy using WordSpotter for your OCR needs!

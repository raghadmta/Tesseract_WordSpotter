using Microsoft.AspNetCore.Mvc;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using Tesseract;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Linq;
using System.IO;

namespace WordSpotter.Controllers
{
    public class TesseractController : Controller
    {
        private const string ImagePath = "wwwroot/images/sample.jpg";
        private static List<(List<Rect> Bounds, string OriginalText)> foundMatches = new List<(List<Rect>, string)>();
        private static int currentMatchIndex = 0;

        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Search(string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
            {
                return Json(new { success = false, message = "Please enter a search term." });
            }

            foundMatches.Clear();
            currentMatchIndex = 0;

            string[] cleanedSearchTerms = CleanString(searchTerm).Split(' ', StringSplitOptions.RemoveEmptyEntries);

            SearchInImage(ImagePath, cleanedSearchTerms);

            if (foundMatches.Count > 0)
            {
                HighlightMatchInImage(ImagePath, currentMatchIndex);
                return Json(new
                {
                    success = true,
                    imagePath = "/Tesseract/GetProcessedImage",
                    matchCount = foundMatches.Count,
                    currentIndex = currentMatchIndex + 1,
                    originalText = foundMatches[currentMatchIndex].OriginalText
                });
            }
            else
            {
                return Json(new { success = false, message = "No matches found." });
            }
        }

        [HttpPost]
        public IActionResult NextMatch()
        {
            if (foundMatches.Count == 0)
            {
                return Json(new { success = false, message = "No matches have been found." });
            }

            currentMatchIndex = (currentMatchIndex + 1) % foundMatches.Count;
            HighlightMatchInImage(ImagePath, currentMatchIndex);

            return Json(new
            {
                success = true,
                imagePath = "/Tesseract/GetProcessedImage",
                matchCount = foundMatches.Count,
                currentIndex = currentMatchIndex + 1,
                originalText = foundMatches[currentMatchIndex].OriginalText
            });
        }

        [HttpPost]
        public IActionResult PreviousMatch()
        {
            if (foundMatches.Count == 0)
            {
                return Json(new { success = false, message = "No matches have been found." });
            }

            currentMatchIndex = (currentMatchIndex - 1 + foundMatches.Count) % foundMatches.Count;
            HighlightMatchInImage(ImagePath, currentMatchIndex);

            return Json(new
            {
                success = true,
                imagePath = "/Tesseract/GetProcessedImage",
                matchCount = foundMatches.Count,
                currentIndex = currentMatchIndex + 1,
                originalText = foundMatches[currentMatchIndex].OriginalText
            });
        }

        [HttpGet]
        public IActionResult GetProcessedImage()
        {
            var imageBytes = HttpContext.Session.Get("ProcessedImage");
            if (imageBytes == null)
            {
                return NotFound();
            }

            return File(imageBytes, "image/jpeg");
        }

        private void SearchInImage(string inputImagePath, string[] searchTerms)
        {
            using (var engine = new TesseractEngine(@"./tessdata", "eng+ara", EngineMode.Default))
            using (var img = Pix.LoadFromFile(inputImagePath))
            using (var page = engine.Process(img))
            using (var iter = page.GetIterator())
            {
                List<(string Word, Rect Bounds)> pageWords = new List<(string, Rect)>();

                iter.Begin();
                do
                {
                    string word = iter.GetText(PageIteratorLevel.Word)?.Trim();
                    if (!string.IsNullOrEmpty(word) && iter.TryGetBoundingBox(PageIteratorLevel.Word, out var rect))
                    {
                        pageWords.Add((word, rect));
                    }
                } while (iter.Next(PageIteratorLevel.Word));

                for (int i = 0; i <= pageWords.Count - searchTerms.Length; i++)
                {
                    bool match = true;
                    for (int j = 0; j < searchTerms.Length; j++)
                    {
                        if (!CleanString(pageWords[i + j].Word).Contains(searchTerms[j], System.StringComparison.OrdinalIgnoreCase))
                        {
                            match = false;
                            break;
                        }
                    }

                    if (match)
                    {
                        List<Rect> matchBounds = pageWords.Skip(i).Take(searchTerms.Length).Select(w => w.Bounds).ToList();
                        string originalText = string.Join(" ", pageWords.Skip(i).Take(searchTerms.Length).Select(w => w.Word));
                        foundMatches.Add((matchBounds, originalText));

                        i += searchTerms.Length - 1;
                    }
                }
            }
        }

        private string CleanString(string input)
        {
            // Remove punctuation 
            return Regex.Replace(input, @"\p{P}", "").ToLower();
        }

        private void HighlightMatchInImage(string inputImagePath, int matchIndex)
        {
            using (var image = Image.FromFile(inputImagePath))
            using (var graphics = Graphics.FromImage(image))
            {
                graphics.SmoothingMode = SmoothingMode.AntiAlias;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

                var highlightBrush = new SolidBrush(Color.FromArgb(128, Color.Yellow));
                var highlightPen = new Pen(Color.Yellow, 2);

                var rects = foundMatches[matchIndex].Bounds;
                var mergedRect = MergeBoundingBoxes(rects);

                graphics.FillRectangle(highlightBrush, mergedRect.X1, mergedRect.Y1, mergedRect.Width, mergedRect.Height);
                graphics.DrawRectangle(highlightPen, mergedRect.X1, mergedRect.Y1, mergedRect.Width, mergedRect.Height);

                 using (var ms = new MemoryStream())
                {
                    image.Save(ms, System.Drawing.Imaging.ImageFormat.Jpeg);
                    var imageBytes = ms.ToArray();

                     HttpContext.Session.Set("ProcessedImage", imageBytes);
                }
            }
        }

        private Rect MergeBoundingBoxes(List<Rect> rects)
        {
            int x1 = rects.Min(r => r.X1);
            int y1 = rects.Min(r => r.Y1);
            int x2 = rects.Max(r => r.X2);
            int y2 = rects.Max(r => r.Y2);

            return new Rect(x1, y1, x2 - x1, y2 - y1);
        }
    }
}

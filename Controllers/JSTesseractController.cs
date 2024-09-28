using Microsoft.AspNetCore.Mvc;

namespace WordSpotter.Controllers
{
    public class JSTesseractController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}

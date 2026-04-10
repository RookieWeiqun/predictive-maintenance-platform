using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Product
{
    public int Productid { get; set; }

    public int? Equipid { get; set; }

    public string? Mlfb { get; set; }

    public string? Serialno { get; set; }
}

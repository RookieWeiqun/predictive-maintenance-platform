using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Company
{
    public int Companyid { get; set; }

    public string Companyname { get; set; } = null!;

    /// <summary>
    /// 统一信用代码
    /// </summary>
    public string CreditCode { get; set; } = null!;
}

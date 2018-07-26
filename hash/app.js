(function() {
    "use strict";
   
    var sha2Input = document.getElementById("sha2-input");
    var sha2Output = document.getElementById("sha2-output");    
    var bcryptInput = document.getElementById("bcrypt-input");
    var bcryptRounds = document.getElementById("bcrypt-rounds");
    var bcryptGenerate = document.getElementById("bcrypt-generate");
    var bcryptGenerating = document.getElementById("bcrypt-generating");
    var bcryptSalt = document.getElementById("bcrypt-salt");
    var bcryptOutput = document.getElementById("bcrypt-output");
    var bcryptDuration = document.getElementById("bcrypt-duration");
    var bcryptCompareInput = document.getElementById("bcrypt-compare-input");
    var bcryptCompare = document.getElementById("bcrypt-compare");
    var bcryptComparing = document.getElementById("bcrypt-comparing");
    var bcryptCompareOutput = document.getElementById("bcrypt-compare-output");
    var bcryptCompareDuration = document.getElementById("bcrypt-compare-duration");
    
    sha2Input.addEventListener("input", function() { 
        if (0 == sha2Input.value.length) {
            sha2Output.textContent = "enter data above"
        } else {
            sha2Output.textContent = sha256(sha2Input.value);
        }
    });

    bcryptInput.addEventListener("input", function() {
        bcryptGenerate.disabled = (0 == bcryptInput.value.length);
    });

    bcryptGenerate.addEventListener("click", function() {
        bcryptGenerate.disabled = true;
        bcryptGenerating.classList.remove("hidden");
        bcryptSalt.textContent = "working...";
        bcryptOutput.textContent = "working...";
        var startTime = Date.now();
        dcodeIO.bcrypt.genSalt(parseInt(bcryptRounds.value), function(err, salt) {
            if (err) {
                alert(err.message || err);
                return;
            }
            bcryptSalt.textContent = salt;
            dcodeIO.bcrypt.hash(bcryptInput.value, salt, function(err, hash) {
                if (err) {
                    alert(err.message || err);
                    return;
                }
                var endTime = Date.now();
                bcryptOutput.textContent = hash;
                bcryptDuration.textContent = Math.round(endTime - startTime);
                bcryptCompareInput.value = bcryptInput.value;
                bcryptGenerating.classList.add("hidden");
                bcryptGenerate.disabled = false;
                bcryptCompare.disabled = false;
            });
        });
    });

    bcryptCompare.addEventListener("click", function() {
        bcryptCompare.disabled = true;
        bcryptComparing.classList.remove("hidden");
        bcryptCompareOutput.textContent = "working...";
        var startTime = Date.now();
        dcodeIO.bcrypt.compare(bcryptCompareInput.value, bcryptOutput.textContent, function(err, matches) {
            if (err) {
                alert(err.message || err);
                return;
            }

            var endTime = Date.now();
            bcryptCompareOutput.textContent = matches;
            bcryptCompareDuration.textContent = Math.round(endTime - startTime);
            bcryptCompare.disabled = false;
            bcryptComparing.classList.add("hidden");
            
        });
    });

})();